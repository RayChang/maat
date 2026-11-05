# T02 — Parse the complete command grammar and classify errors

DECISION (implementer default): long flags use separate values, repeated --cli/--evidence/--target preserve input order, scalar duplicates are usage errors, and --json conflicts with non-json --format. Global flags are accepted on every command. No --help, --fail-on, diff, or apply command is introduced. Empty target lists for plan select the three minimal startup checks specified by the improvement-plan task. policy validate without a file reads .maat/policy.yaml relative to the current directory. flow list uses the nearest ancestor with .git or .maat/policy.yaml; no marker means the current directory.

## Files

- Create: `src/errors.ts`, `src/cli/args.ts`.
- Modify: None.
- Test path: `tests/cli/args.test.ts`.

## Interfaces

Consumes:

None. Bun and Node built-ins are available; they are not cross-task exports.

Produces:

```ts
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
export declare function parseArgs(argv: string[]): Args;
export declare function one(args: Args, flag: string): string | undefined;
```

## Steps

- [ ] 1. Write the failing test at `tests/cli/args.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { parseArgs, one } from "../../src/cli/args";
import { MaatError } from "../../src/errors";
test("repeated targets, global flags, strict values, exit 2", () => {
  const a = parseArgs(["scan", ".", "--cli", "codex", "--cli", "copilot", "--json"]);
  expect(a.flags.cli).toEqual(["codex", "copilot"]);
  expect(one(a, "json")).toBe("true");
  for (const input of [["scan","--fail-on","missing"], ["scan","--format","bad"],
    ["flow","checkpoint","--flow","f"], ["scan","--json","--format","both"],
    ["version","extra"], ["scan","--policy","a","--policy","b"]]) {
    try { parseArgs(input); throw Error("accepted bad input"); }
    catch (e) { expect(e).toBeInstanceOf(MaatError); expect((e as MaatError).code).toBe(2); }
  }
  expect(parseArgs(["flow","list"]).command).toBe("flow list");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/cli/args'`.

```sh
bun test tests/cli/args.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/errors.ts** (complete file)

```ts
export class MaatError extends Error {
  constructor(public code: 1 | 2 | 3 | 4, message: string) { super(message); this.name = "MaatError"; }
}
```

**src/cli/args.ts** (complete file)

```ts
import { MaatError } from "../errors";
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
const grammar: Record<string, { flags: string[]; required?: string[]; min?: number; max?: number }> = {
  scan: { flags: ["cli","policy","evidence","snapshot","format"], max: 1 },
  evaluate: { flags: ["snapshot","policy","evidence"], required: ["snapshot"] },
  plan: { flags: ["report","target"], required: ["report"] },
  explain: { flags: [], min: 1, max: 1 },
  "catalog list": { flags: ["layer","tier"] }, "catalog validate": { flags: [] },
  "policy init": { flags: [] }, "policy validate": { flags: [], max: 1 },
  "attest template": { flags: ["check"], required: ["check"] },
  "flow open": { flags: ["plan","snapshot"], required: ["plan","snapshot"] },
  "flow approve": { flags: ["flow","scope","by"], required: ["flow","scope","by"] },
  "flow authorize": { flags: ["flow","command","by"], required: ["flow","command","by"] },
  "flow checkpoint": { flags: ["flow","action","phase","fingerprints"], required: ["flow","action","phase","fingerprints"] },
  "flow record": { flags: ["flow","kind","file"], required: ["flow","kind","file"] },
  "flow decide": { flags: ["flow","event","by"], required: ["flow","event"] },
  "flow status": { flags: ["flow"], required: ["flow"] },
  "flow list": { flags: [] }, version: { flags: [] }
};
const global = ["json","out","quiet","catalog","ledger"];
const boolean = new Set(["json","quiet"]);
const repeat = new Set(["cli","evidence","target"]);
const enums: Record<string,string[]> = {
  cli: ["claude-code","codex","copilot"], format: ["markdown","json","both"],
  tier: ["baseline","advanced"], layer: ["foundation","prompt","context","harness","loop","graph"],
  phase: ["before","after"], kind: ["change","evaluation"],
  event: ["accept","continue-fix","stop","handoff","resume"]
};
export function one(a: Args, key: string): string | undefined { return a.flags[key]?.[0]; }
export function parseArgs(argv: string[]): Args {
  const words = [...argv]; let command = words.shift() ?? "";
  if (["catalog","policy","attest","flow"].includes(command)) command += " " + (words.shift() ?? "");
  const spec = grammar[command];
  const bad = (m: string): never => { throw new MaatError(2, "usage_error: " + m); };
  if (!spec) bad("unknown command");
  const a: Args = { command, positionals: [], flags: {} };
  while (words.length) {
    const word = words.shift()!;
    if (!word.startsWith("-")) { a.positionals.push(word); continue; }
    if (!word.startsWith("--")) bad("unknown flag " + word);
    const key = word.slice(2);
    if (![...global,...spec.flags].includes(key)) bad("unknown flag " + word);
    if (a.flags[key] && !repeat.has(key)) bad("duplicate flag " + word);
    const value = boolean.has(key) ? "true" : words.shift();
    if (!value || value.startsWith("--")) bad("missing value for " + word);
    const v = value as string;
    if (enums[key] && !enums[key].includes(v)) bad("invalid value for " + word);
    (a.flags[key] ??= []).push(v);
  }
  if (a.positionals.length < (spec.min ?? 0) || a.positionals.length > (spec.max ?? 0))
    bad("wrong positional count");
  for (const k of spec.required ?? []) if (!one(a,k)) bad("missing --" + k);
  if (one(a,"json") && one(a,"format") && one(a,"format") !== "json") bad("--json conflicts with --format");
  return a;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/cli/args.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/errors.ts src/cli/args.ts tests/cli/args.test.ts
git commit -m '✨ feat(cli): define command grammar and exit errors'
```

