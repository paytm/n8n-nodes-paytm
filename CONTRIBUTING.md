# Contributing

## Lint policy

This repo uses **ESLint** with [`eslint-plugin-n8n-nodes-base`](https://github.com/ivov/eslint-plugin-n8n-nodes-base) for nodes and credentials.

- Run **`npm run lint`** before opening a PR. The same check runs in **`npm run prepublishOnly`** (before `npm publish`).
- Auto-fix what you can: **`npm run lintfix`**.
- Do not disable rules unless there is a short comment explaining why (prefer fixing the UI copy or structure instead).

## Build

- **`npm run build`** — compiles TypeScript to `dist/` and runs the icon build step. Published packages ship **`dist/`** only (`package.json` `files`).

## Tests

There is **no automated test suite** yet. Changes should be exercised manually in n8n (test credentials, test merchant adapter URL). Document risky changes in the PR.

## Releases

- Bump **`version`** in `package.json` per [semver](https://semver.org/).
- Ensure **`npm run build`** and **`npm run lint`** succeed.
- Add release notes (GitHub Releases or `CHANGELOG.md` if you maintain one).

## Optional dev helpers

Scripts such as `rebuild-refresh-n8n.sh` are **local developer conveniences** (rebuild the package, reinstall under `~/.n8n/nodes`, restart a sibling `n8n-runner`). They are **not** required for end users installing from npm.
