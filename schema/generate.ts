#!/usr/bin/env ts-node

import * as path from 'path'
import { glob } from 'glob'
import { writeFileSync, mkdirSync } from 'fs'
import * as crypto from 'crypto'
import {
	quicktype,
	InputData,
	JSONSchemaInput,
	FetchingJSONSchemaStore,
} from 'quicktype-core'
import * as TSJ from 'ts-json-schema-generator'

// Generate Unity meta file for a C# script
function generateUnityMetaFile(filePath: string): string {
	// Unity uses a GUID based on the file path
	// We'll generate a consistent GUID from the file path
	const guid = crypto.createHash('md5').update(filePath).digest('hex')

	return `fileFormatVersion: 2
guid: ${guid}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`
}

async function exportCSharp(namespace: string, inputData: InputData) {
	return await quicktype({
		inputData,
		lang: 'cs',
		rendererOptions: {
			'framework': 'NewtonSoft',
			'array-type': 'list',
			'namespace': namespace,
			'features': 'attributes-only',
		},
	})
}

/*
async function exportCPlusPlus(namespace: string, inputData: InputData) {
	return await quicktype({
		inputData,
		lang: 'cpp',
		rendererOptions: {
			namespace,
			'just-types': true,
			'code-format': 'with-struct',
		}
	})
}
*/

async function main() {
	// optional CLI arg: --out-cs <path>
	const args = process.argv.slice(2)
	let outCsRoot: string | null = null
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--out-cs' && args[i + 1]) {
			outCsRoot = path.resolve(process.cwd(), args[i + 1])
			i++
		}
	}
	// get all the schema files in the project
	const files = await new Promise<string[]>(resolve => glob(__dirname + '/src/**/*.ts', (_, matches) => resolve(matches)))

	// iterate over all schema files
	for (const file of files) {
		const namespace = 'Schema.' + path.dirname(file.replace(__dirname + '/src', '').replace(/^\/+/g, '')).replace(/\/|\\/g, '.')
		const name = path.basename(file).replace('.ts', '')

		console.log('Processing:', file, '->', `${namespace}.${name}`)

		const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore())

		const schema = TSJ.createGenerator({ path: file }).createSchema()
		//writeFileSync(path.join(path.dirname(file), `${name}.schema.json`), JSON.stringify(schema, null, 2))

		await schemaInput.addSource({ name: '', uris: ['#/definitions/'], isConverted: true, schema: JSON.stringify(schema) })

		const inputData = new InputData()
		inputData.addInput(schemaInput)

		// generate csharp
		const { lines: csharp } = await exportCSharp(`${namespace}.${name}`, inputData)
		// default emits next to .ts; if --out-cs is set, mirror folder structure under src/
		let targetDir = path.dirname(file)
		if (outCsRoot) {
			const rel = path.relative(path.join(__dirname, 'src'), path.dirname(file))
			targetDir = path.join(outCsRoot, rel)
		}
		mkdirSync(targetDir, { recursive: true })
		const csFilePath = path.join(targetDir, `${name}.cs`)
		writeFileSync(csFilePath, csharp.join('\n'))

		// Generate Unity .meta file if outputting to Unity package
		if (outCsRoot) {
			const metaContent = generateUnityMetaFile(csFilePath)
			writeFileSync(`${csFilePath}.meta`, metaContent)
			console.log('  Generated .meta file')
		}

		/*
		// generate c++
		const { lines: cpp } = await exportCPlusPlus(`${namespace}.${name}`, inputData)
		writeFileSync(path.join(path.dirname(file), `${name}.h`), cpp.join('\n'))
		*/
	}
}

main()
