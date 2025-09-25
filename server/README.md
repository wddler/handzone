# HANDZONe Project

## Overview
HANDZONe server is a web application designed to control and monitor robots for a virtual reality environment. It provides a user-friendly interface for managing and requesting robot sessions for both simulated and real robots, monitoring their status, and interacting with them in real-time.

## Features
- **Robot Control**: Start, stop, and manage robot sessions for simulated and real robots.
- **Real-time Monitoring**: View the status and logs of robots in real-time.
- **User Authentication**: Secure access to the application with user roles (admin and regular users).
- **Virtual Reality Integration**: Control robots in a VR environment.
- **Grasshopper Integration**: Run programs inside Grasshopper with [https://github.com/visose/Robots](Robots) plugin. Uploading meshes from Grasshopper to the Virtual Reality session.
- **Logging**: Keep track of robot activities and errors through detailed logs.

## Prerequisites
Before you begin, ensure you have met the following requirements:
- **[Docker](https://www.docker.com/)**: For containerized deployment.

## Getting Started

### 1. Clone the Repository
Clone the project repository to your local machine:
```bash
git clone https://github.com/newmedia-centre/handzone.git
cd handzone/server
```

### 2. Set Up Environment Variables
Create a `.env` file from the root directory and configure the necessary environment variables. You can use the provided `.env_template` as a reference.

Admin users
- Set `ADMIN_EMAILS` in `.env` to a comma-separated list of emails that should be admins, for example:
  - `ADMIN_EMAILS="alice@example.com,bob@example.com"`
- When a user with a matching email signs in, they are automatically elevated to admin (`User.admin = true`).

Manual admin promotion
- Prisma Studio (UI):
  - `cd server && npx prisma studio`
  - Open the `User` table and set `admin` to `true` for the target user, then Save.
- Prisma CLI (SQL):
  - Host run: `cd server && npx prisma db execute --stdin <<<'UPDATE "User" SET "admin"=true WHERE "email"='''alice@example.com''' ;'`
  - In dev container:
    - `docker compose -f docker-compose-dev.yml exec app-dev sh`
    - Inside shell: `npx prisma db execute --stdin <<'SQL'
UPDATE "User" SET "admin"=true WHERE "email"='alice@example.com';
SQL`
  - Replace `alice@example.com` with the user’s email.

### 3. Initialize the database (first time)
Option A — using Docker (recommended): the dev compose applies migrations automatically on start, no manual step needed.

Option B — on host: apply the initial Prisma migration and generate the client:
```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start the HANDZONe server
Use Docker Compose to start the application in development mode. Run the following command in the project directory:
```bash
# Run the server and database in the background
docker compose -f docker-compose-dev.yml up -d
```

### 5. Start the Docker Proxy (Optional)
> This step is optional and needed whenever you want to run the server and the Unity application on same machine.

To set up the Docker socket proxy, run:
```bash
# Run the Docker socket proxy in the background
docker compose -f docker-compose-proxy.yml up -d
```

### 6. Access the Application
Once the containers are running, you can access the application at `http://localhost:3000`.

## Local URSim (Optional)
Develop and test against a Universal Robots simulator without real hardware.

Why
- Exercise TCP (30003) and VNC flows locally.
- Match production robot interfaces and ports.

Start URSim
- Start the simulator in a separate compose file on the same network:
  - `docker compose -f docker-compose-ursim.yml up -d`
- Access the URSim UI (noVNC):
  - `http://localhost:6080/vnc.html?host=localhost&port=6080`

Run the server with URSim
- In Docker (recommended for network parity):
  1) Ensure `.env` has `DOCKER_NETWORK=handzone-network` (default).
  2) Start DB and server (server VNC proxy is fixed at 5900): `docker compose -f docker-compose-dev.yml up -d`
  3) Start URSim (maps host 5990 -> container 5900 to avoid conflict): `docker compose -f docker-compose-ursim.yml up -d`
  4) `server/config.json` uses `"address": "ursim"` so the server reaches URSim by service DNS on the shared network.

Docker connection
- Default (socket): the server connects via the mounted UNIX socket at `/var/run/docker.sock` (see `server/config.json → DOCKER.OPTIONS.socketPath`).
- TCP proxy option: start `docker-compose-proxy.yml` and switch `DOCKER.OPTIONS` accordingly.

Examples for `server/config.json`:

Socket on host or in container
```json
{
  "DOCKER": {
    "OPTIONS": { "socketPath": "/var/run/docker.sock" }
  }
}
```

TCP proxy from inside a container on the same network (proxy service name is `docker`):
```json
{
  "DOCKER": {
    "OPTIONS": { "host": "docker", "port": 2375 }
  }
}
```

TCP proxy from the host (server runs on your machine):
```json
{
  "DOCKER": {
    "OPTIONS": { "host": "localhost", "port": 2375 }
  }
}
```

Note: `server/docker-compose-proxy.yml` joins the `${DOCKER_NETWORK}` so the proxy is reachable as `docker` from other services in the same stack.

Compose naming
- The Compose project name is set to `handzone` in compose files. Container names include:
  - `handzone-db` (Postgres)
  - `handzone-dev` (dev server)
  - `handzone-docker` (socket proxy when used)
  - `handzone` (production app when using docker-compose.yml)

Prisma on startup
- The dev compose runs `prisma generate` and `prisma migrate deploy` before the server starts, ensuring tables like `Robot` exist.
 - Admin auto-elevation: the server checks `ADMIN_EMAILS` on session validation and updates the user record accordingly.

Port collision note (VNC)
- The server’s VNC proxy listens on 5900 and is mapped as `5900:5900` in dev compose.
- URSim’s VNC is exposed on `5990` on the host (container still listens on 5900). Use noVNC at 6080 if preferred.
- Virtual robots (auto‑spawned) bind host ports 5901, 5902, … for their VNC connections; they won’t conflict with the server’s 5900.

Alternative: run Node server on host
- If you run `npm run dev` on your host instead of in Docker, change `robot-1.address` in `server/config.json` to `"localhost"` while keeping URSim running via Docker.

## Build for Production

### 1. Building the application
To build the application for production, run:
```bash
npm run build
```

### 2. Start the Production Server
After building, you can start the production server with:
```bash
npm start
```

## Notes on Database Setup
- The repository includes an initial Prisma migration under `prisma/migrations`. In production, the server runs `prisma migrate deploy` automatically on startup so a fresh DB is initialized.
- For local development, run `npx prisma migrate dev` once before `npm run dev` to create tables. No need to run `db push` if you use migrations.
- When you modify `schema.prisma`, run `npx prisma generate` (or just `npm run dev`, which runs `prisma generate`).

## Contributing
We welcome contributions to the HANDZONe project! If you would like to contribute, please follow these steps.
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push your changes to your forked repository.
5. Submit a pull request.

## Contact
For any inquiries or feedback, please reach out to the project maintainers.
