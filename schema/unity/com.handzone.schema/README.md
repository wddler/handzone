Handzone Schema (Unity Package)

This UPM package contains the generated C# data schema models for the Handzone project.

How it’s built
- Source TypeScript schema files live under `schema/src/`
- The generator (`schema/generate.ts`) emits C# files into `Runtime/` when invoked with `--out-cs`.

Local development
- Generate schema: from repo root run:
  - `cd schema && npm install` (first time)
  - `npm run generate:unity`
- Unity auto‑imports scripts under `Runtime/`.

Using as a Git package
- After pushing this repo, reference it from Unity `manifest.json` via a Git URL with `?path=schema/unity/com.handzone.schema`.
  Example:
  `"com.handzone.schema": "https://your.git.host/handzone.git?path=schema/unity/com.handzone.schema"`

