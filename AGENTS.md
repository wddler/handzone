# Repository Guidelines

## Project Structure & Module Organization
- `server/` – Next.js + Express backend with Prisma and Docker assets.
- `schema/` – Type/schema generator used by server and clients.
- `grasshopper/` – .NET Framework 4.8 Grasshopper plugin (.gha).
- `unity/` – Unity XR client (Unity 2022.3.47f1).
- `.github/` – CI workflows; root `README.md` for overview.

## Build, Test, and Development Commands
- Server
  - Install: `cd server && npm install`
  - Dev (local): `npm run dev` (runs tsx on `src/server/index.ts`)
  - Build/Start: `npm run build && npm start`
  - Lint: `npm run lint`
  - Docker (optional): `docker compose -f server/docker-compose.yml up`
  - Env: copy `server/.env_template` to `server/.env` and fill secrets.
- Schema
  - Generate: `cd schema && npm install && npm run generate`
- Grasshopper
  - Open `grasshopper/HandzoneGrasshopper.sln` in Visual Studio 2019+ (net48) and Build Release. Output is a `.gha`.
- Unity
  - Open the `unity/` folder with Unity `2022.3.47f1`. Use Play Mode or File → Build Settings.

## Coding Style & Naming Conventions
- TypeScript/React (server)
  - ESLint configured; fix issues with `npm run lint -- --fix`.
  - 2‑space indent; camelCase variables; PascalCase components; kebab‑case filenames in `src/`.
  - Use path aliases `@/*` and `@/types/*` (see `server/tsconfig.json`).
- C# (grasshopper/unity)
  - PascalCase for types/methods, camelCase for locals/fields; target net48 in Grasshopper.

## Testing Guidelines
- No formal test suite is configured yet.
- When adding tests:
  - Server: colocate `.test.ts` files or use `__tests__/`; prefer Vitest/Jest.
  - Keep tests runnable locally; document any setup in the PR.

## Commit & Pull Request Guidelines
- Commits: short, imperative, present tense (e.g., "Fix path", "Add schema generator").
- PRs: include purpose, linked issues, local run steps, and screenshots/GIFs for UI changes (server/unity). Note env/DB changes and update docs.

## Security & Configuration Tips
- Never commit secrets; use `server/.env` (template provided).
- Run `npx prisma generate` when Prisma models change.
- Large binaries/assets belong in `unity/Assets` or external storage; avoid adding unnecessary binaries to Git.

