/*
 *The MIT License (MIT)
 * Copyright (c) 2025 NewMedia Centre - Delft University of Technology
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// import dependencies
import { EventEmitter } from 'events'
import { Socket } from 'net'
import { Sema } from 'async-sema'
import { VNCProxy } from './vnc'
import env from '../environment'
import { RobotConnection } from './connection'
import { robotLogger as logger } from '../logger'
import { prisma } from '@/server/db'

// import types
import type { ManagerEmitter } from './emitter'
import type { ContainerInspectInfo } from 'dockerode'
import type { SessionType } from '@/types/Socket/Index'
import type { RobotInfo } from './connection'

/** The TCP Server for communicating with the robots */
export class RobotManager extends (EventEmitter as new () => ManagerEmitter) {
	/** The TCP Sockets for sending messages through the TCP Server */
	connections: Map<string, RobotConnection>
	vnc: VNCProxy
	_semaphore: Sema

	constructor() {
		// initialize the EventEmitter
		super()

		// initialize the class variables
		this.connections = new Map()
		this.vnc = new VNCProxy(this)
		this._semaphore = new Sema(1)

		// sync the robots with the database
		this._syncRobots().then(robots => {
			robots.forEach(robot => {
				// try to connect to the robots
				robot && this._tryCreateRobotConnection(robot)
			})
		})
	}

	/** Tries to connect to an endpoint */
	async connectVirtualRobot(container: ContainerInspectInfo, virtual: SessionType) {
		// get the robot slot
		const slot = container.Config.Labels['slot']
		if (!slot) {
			logger.error('Found container without slot label')
			throw new Error('Found container without slot label')
		}

		// When connecting from within Docker, we use the internal port, not the host-mapped port
		const internalPort = 30003
		const internalVnc = 5900
		let port = internalPort
		let vnc = internalVnc
		const slotSuffix = slot.toString().padStart(2, '0')

		// Get the IP address from the container's network settings
		// When the server runs in Docker, it needs to connect via the container's IP on the shared network
		let address = env.DOCKER.OPTIONS.host || 'localhost'

		// Extract the network name from the environment or use the default
		const networkName = env.DOCKER_NETWORK || 'handzone-network'

		// Log the network settings for debugging
		logger.info(`Container network settings:`, {
			containerName: container.Name,
			networks: Object.keys(container.NetworkSettings?.Networks || {}),
			networkName,
		})

		// Try to get the IP address from the container's network settings
		if (container.NetworkSettings?.Networks?.[networkName]?.IPAddress) {
			address = container.NetworkSettings.Networks[networkName]!.IPAddress
			logger.info(`Using container IP address: ${address} from network ${networkName}`)
		} else {
			// Check if any network has an IP address
			const networks = container.NetworkSettings?.Networks || {}
			const availableNetworks = Object.entries(networks).filter(([_, net]) => net.IPAddress)

			if (availableNetworks.length > 0 && availableNetworks[0]) {
				const [firstNetwork, networkInfo] = availableNetworks[0]
				address = networkInfo.IPAddress!
				logger.info(`Using IP from network ${firstNetwork}: ${address}`)
			} else {
				logger.warn(`Could not find IP for network ${networkName}, falling back to ${address}`)
				port = Number(`3${slotSuffix}03`) // fallback to host-mapped port
				vnc = Number(`59${slotSuffix}`)
			}
		}

		const info: RobotInfo = {
			name: container.Name.split('/')[1]!,
			address,
			port,
			vnc,
			camera: []
		}

		logger.info(`Virtual robot connection info: ${info.name} at ${address}:${port}`)
		this._tryCreateRobotConnection(info, virtual)
		return info
	}

	// private methods

	/** Parses the given RemoteAddress into an IPv4 Address */
	_parseAddress(address?: string) {
		if (!address) {
			logger.error('Address is undefined while parsing IPv4 address')
			throw new Error('Address is undefined while parsing IPv4 address')
		}

		if (address.includes(':')) {
			return address.replace(/^.*:/, '')
		}

		return address
	}

	/** Starts the TCP Client */
	_tryCreateRobotConnection(robot: RobotInfo, virtual: SessionType | null = null, retryCount: number = 0) {
		// create the logger for the robot
		const robotLogger = logger.child({ entity: 'robot', robot, label: `ROBOT:${robot.name}` })

		// create the TCP client
		const socket = new Socket()
		socket.setTimeout(5000)

		if (retryCount === 0) {
			robotLogger.info(`Connecting to robot...`)
		}
		socket.connect(robot.port, robot.address)

		let stable: NodeJS.Timeout

		// Handle timeout
		socket.on('timeout', () => {
			robotLogger.warn(`Connection timeout, retrying...`)
			socket.destroy()
			const delay = virtual ? 5000 : 60000 // 5s for virtual, 60s for real robots
			setTimeout(() => {
				this._tryCreateRobotConnection(robot, virtual, retryCount + 1)
			}, delay)
		})

		// retry until a connection is established
		socket.on('error', (error: NodeJS.ErrnoException) => {
			if (error.code === 'ECONNREFUSED') {
				socket.destroy() // Clean up the socket before retrying
				// For virtual robots, retry more frequently (every 5s instead of 60s)
				const delay = virtual ? 5000 : 60000
				const retryMsg = retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''
				return setTimeout(() => {
					robotLogger.http(`Connection failed${retryMsg}, retrying...`)
					this._tryCreateRobotConnection(robot, virtual, retryCount + 1)
				}, delay)
			}
			robotLogger.error('Socket error:', error)
		})

		// add clients when connected
		socket.on('connect', () => {
			const connection = new RobotConnection(socket, robot, virtual, robotLogger)
			this.connections.set(robot.name, connection)
			stable = setTimeout(() => {
				this.emit('join', connection, this.connections)
			}, 10000)
			robotLogger.info(`Connected`)
		})

		// remove from clients when closed
		socket.on('close', () => {
			const connection = this.connections.get(robot.name)
			if (connection) {
				// remove the connection
				this.emit('leave', connection, this.connections)
				connection.clear()
				this.connections.delete(robot.name)

				// try to reconnect
				robotLogger.info(`Disconnected, retrying...`)
				clearTimeout(stable)
				setTimeout(() => {
					this._tryCreateRobotConnection(robot, virtual)
				}, 5000)
			}
		})
	}

	/** Syncs the robots with the database */
	async _syncRobots() {
		// disable all robots
		await prisma.robot.updateMany({
			data: {
				active: false
			}
		})

		// iterate through the env robots
		const tasks = env.ROBOTS.map(async (robot) => {
			try {

				// find the robot in the database
				const updated = await prisma.robot.update({
					where: {
						name: robot.name
					},
					data: {
						active: true
					}
				}).catch(error => {
					// check if the robot was not found
					if (error.code === 'P2025') {
						logger.info(`Robot ${robot.name} not found in the database, creating...`, { robot })
					} else {
						throw error
					}
				})

				if (!updated) {
					// create the robot in the database
					await prisma.robot.create({
						data: {
							name: robot.name,
							type: 'URSIM_CB3_3_15_8',
							active: true
						}
					})

					logger.info(`Inserted robot ${robot.name} from the env into the database`, { robot })
				} else {
					logger.info(`Activated robot ${robot.name}`, { robot })
				}

				return robot
			} catch (error) {
				logger.error(`Error syncing robot ${robot.name} with the database`, { error, robot })
			}
		})

		// wait for all tasks to complete
		logger.info('Syncing robots with the database...')
		const res = await Promise.all(tasks)
		logger.info('Synced robots with the database!')

		return res
	}
}

// init tcp server
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const robots: RobotManager = global.robots ?? new RobotManager()
export default robots

global.robots = robots