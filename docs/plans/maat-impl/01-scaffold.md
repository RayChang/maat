# T01 — Scaffold Bun, TypeScript, and version

DECISION (implementer default): tool/catalog version starts at 0.1.0. report_schema, policy_schema and ledger_schema are 1.0.0; snapshots and plans use report_schema. Adapter metadata is unverified until exercised. Run from the existing repository root on Bun >=1.4.0. The package is maat, private; no remote or npm publication is assumed. The dependency installation command creates bun.lock with only the two allowed development dependencies.

## Files

- Create: `package.json`, `tsconfig.json`, `bunfig.toml`, `.gitignore`, `src/versions.ts`, `src/cli/index.ts`.
- Modify: None.
- Test path: `tests/cli/version.test.ts`.
- Generated paths: `bun.lock`.

## Interfaces

Consumes:

None. Bun and Node built-ins are available; they are not cross-task exports.

Produces:

```ts
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
export declare const versions: Versions;
```

## Steps

- [ ] 1. Write the failing test at `tests/cli/version.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { versions } from "../../src/versions";
test("version contains every schema and adapter without running a target", () => {
  expect(versions.tool_version).toBe("0.1.0");
  expect(versions.catalog_version).toBe("0.1.0");
  expect(versions.adapters.map(a => a.name)).toEqual(["claude-code", "codex", "copilot"]);
  for (const key of ["report_schema", "policy_schema", "ledger_schema"] as const)
    expect(versions[key]).toBe("1.0.0");
  const run = Bun.spawnSync([process.execPath, "src/cli/index.ts", "version", "--json"]);
  expect(run.exitCode).toBe(0);
  expect(JSON.parse(run.stdout.toString())).toEqual(versions);
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/versions'`.

```sh
bun test tests/cli/version.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**package.json** (complete file)

```json
{
  "name": "maat",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "maat": "dist/cli.js"
  },
  "engines": {
    "bun": ">=1.4.0"
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "build": "bun build src/cli/index.ts --target=bun --outfile=dist/cli.js"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/bun": "^1.4.0"
  }
}
```

**tsconfig.json** (complete file)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": [
      "bun"
    ],
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true
  },
  "include": [
    "src/**/*.ts",
    "scripts/**/*.ts",
    "tests/**/*.ts"
  ],
  "exclude": [
    "tests/fixtures",
    "dist"
  ]
}
```

**bunfig.toml** (complete file)

```toml
[test]
root = "./tests"
```

**.gitignore** (complete file)

```text
node_modules/
dist/
```

**src/versions.ts** (complete file)

```ts
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
export const versions: Versions = {
  tool_version: "0.1.0", report_schema: "1.0.0", policy_schema: "1.0.0",
  ledger_schema: "1.0.0",
  catalog_version: "0.1.0",
  adapters: ["claude-code", "codex", "copilot"].map(name => ({
    name, adapter_version: "1.0.0", verified_cli_range: "unverified",
    checked_at: "2026-11-04"
  }))
};
```

**src/cli/index.ts** (complete file)

```ts
#!/usr/bin/env bun
import { versions } from "../versions";
const argv = process.argv.slice(2);
if (argv[0] === "version" && argv.slice(1).every(a => a === "--json")) {
  console.log(argv.includes("--json") ? JSON.stringify(versions) : JSON.stringify(versions, null, 2));
} else {
  console.error("usage_error: expected maat version [--json]");
  process.exitCode = 2;
}
```

**command: install development dependencies** (complete file)

```sh
bun install --ignore-scripts
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/cli/version.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- package.json tsconfig.json bunfig.toml .gitignore src/versions.ts src/cli/index.ts tests/cli/version.test.ts bun.lock
git commit -m '✨ feat(cli): bootstrap maat and version output'
```

