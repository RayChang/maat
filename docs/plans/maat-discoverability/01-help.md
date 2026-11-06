# L01 — maat help, and the skill says where formats live

A clean run of the diagnose skill on fvg could not discover how to use maat: `maat`, `maat help` and `maat scan --help` all failed with `usage_error` and listed nothing; the skill names `--evidence` without its file shape, names "loops" without saying they live under `applicability.loop.loops`, never mentions `maat catalog list`, and does not say that non-item ids such as capabilities need their `@1` version for `maat explain`. The agent tried more than ten evidence shapes, all rejected with `schema_error: $`. Owner decision 2026-11-06: add `maat help` (generated from the existing argument grammar), point every usage error to it, and add the missing pointers to the skill. No new behavior beyond printing.

Owner rule: over-design is forbidden. One command that prints the grammar, one hint in usage errors, skill lines, one test, contract and README lines.

## Files

- Create: None.
- Modify: `tests/cli/main.test.ts` (append one test), `tests/skills/contracts.test.ts`, `src/cli/args.ts`, `src/cli/main.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md`, `README.md` (anchored edits).
- Test paths: `tests/cli/main.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
export declare function parseArgs(argv: string[]): Args;   // src/cli/args.ts; grammar, global, boolean, repeat, enums are module constants
export declare function main(argv: string[], now?: string, cwd?: string): Promise<{ code: number; stdout: string; stderr: string }>;
```

Produces:

```ts
// src/cli/args.ts
export function usage(): string;   // one line per command, then a "Global flags:" line
```

## Steps

- [ ] 1. Write the failing tests.

  a. Append exactly this to the end of `tests/cli/main.test.ts`:

```ts
test("help lists every command and usage errors point to it",async()=>{
 const r=await main(["help"]);
 expect(r.code).toBe(0);
 expect(r.stdout).toContain("maat scan [<arg>] [--cli <claude-code|codex|copilot> ...]");
 expect(r.stdout).toContain("maat evaluate --snapshot <value>");
 expect(r.stdout).toContain("maat attest template --check <value>");
 expect(r.stdout).toContain("Global flags: [--json]");
 expect((await main(["nope"])).stderr).toBe("usage_error: unknown command (run maat help)\n");
});
```

  b. In `tests/skills/contracts.test.ts`, replace

```text
 expect(diagnose).toContain("If the report lists scan_limit diagnostics");
```

  with

```text
 expect(diagnose).toContain("If the report lists scan_limit diagnostics");
 expect(diagnose).toContain("Run maat help for every command and flag");
 expect(diagnose).toContain("declared under applicability.loop.loops");
 expect(diagnose).toContain("plus source and provided_by");
```

- [ ] 2. Run the focused tests; expect exit 1: the new `main.test.ts` test fails at `expect(r.code).toBe(0)` (`help` is an unknown command, code 2), and a new `toContain` in `contracts.test.ts` fails.

```sh
bun test tests/cli/main.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement with these anchored edits, each anchor occurring exactly once. Change nothing else. Some blocks contain backslashes (`"\n"`); copy them byte-exact.

  a. In `src/cli/args.ts`, replace

```text
  "flow list": { flags: [] }, version: { flags: [] }, update: { flags: [] }
```

  with

```text
  "flow list": { flags: [] }, version: { flags: [] }, update: { flags: [] }, help: { flags: [] }
```

  b. In `src/cli/args.ts`, replace

```text
  const bad = (m: string): never => { throw new MaatError(2, "usage_error: " + m); };
```

  with

```text
  const bad = (m: string): never => { throw new MaatError(2, "usage_error: " + m + " (run maat help)"); };
```

  c. In `src/cli/args.ts`, replace

```text
export function one(a: Args, key: string): string | undefined { return a.flags[key]?.[0]; }
```

  with

```text
export function one(a: Args, key: string): string | undefined { return a.flags[key]?.[0]; }
export function usage(): string {
  const arg = (s: { min?: number; max?: number }) => (s.max ?? 0) === 0 ? "" : (s.min ?? 0) > 0 ? " <arg>" : " [<arg>]";
  const flag = (k: string, required: boolean) => { const f = "--" + k + (boolean.has(k) ? "" : " <" + (enums[k]?.join("|") ?? "value") + ">") + (repeat.has(k) ? " ..." : ""); return required ? " " + f : " [" + f + "]"; };
  return Object.entries(grammar).map(([c, s]) => "maat " + c + arg(s) + s.flags.map(k => flag(k, !!s.required?.includes(k))).join("")).join("\n")
    + "\nGlobal flags:" + global.map(k => flag(k, false)).join("") + "\n";
}
```

  d. In `src/cli/main.ts`, replace

```text
import { parseArgs,one } from "./args";
```

  with

```text
import { parseArgs,one,usage } from "./args";
```

  e. In `src/cli/main.ts`, replace

```text
  if(a.command==="update")return runUpdate();
```

  with

```text
  if(a.command==="update")return runUpdate();
  if(a.command==="help")return {code:0,stdout:usage(),stderr:""};
```

  f. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
maat update                       從 GitHub 重新安裝最新版（唯一會連網的命令）
```

  with

```text
maat update                       從 GitHub 重新安裝最新版（唯一會連網的命令）
maat help                         列出每個命令、位置參數與旗標；用法錯誤的訊息也會提示執行它（2026-11-06 補充）
```

  g. In `skills/maat-diagnose/SKILL.md`, replace

```text
fill only project parts: target_clis, project exclusions, loops, and attestations.
```

  with

```text
fill only project parts: target_clis, project exclusions, loops (declared under applicability.loop.loops as id, kind, scope), and attestations.
```

  h. In `skills/maat-diagnose/SKILL.md`, replace

```text
Read the summary first, then use maat explain for the specific check, capability, rule card, or template.
```

  with

```text
Run maat help for every command and flag. maat catalog list lists the item ids.
Read the summary first, then use maat explain for the specific check, capability, rule card, or template; ids other than items carry their version, such as verify.entrypoint-declared@1.
```

  i. In `skills/maat-diagnose/SKILL.md`, replace

```text
Each attestation quote must be whole lines copied from its cited range; maat rejects any other quote.
```

  with

```text
Each attestation quote must be whole lines copied from its cited range; maat rejects any other quote. Each material is {path, lines: "a-b", sha256 of the whole file as listed in the snapshot, quote}.
```

  j. In `skills/maat-diagnose/SKILL.md`, replace

```text
Submit only explicitly provided, sanitized evidence with --evidence.
```

  with

```text
Record confirmed attestations in the draft policy's attestations list. Submit only explicitly provided, sanitized evidence with --evidence: one YAML record per file, either an attestation (the attest template fields plus source and provided_by) or an agent assessment (check, claim, stance, citations, uncertainty, by, scope, catalog_version, item_version, source, provided_by).
```

  k. In `README.md`, replace

```text
| `maat update` | 從 GitHub 重新安裝最新版（唯一會連網的命令） |
```

  with

```text
| `maat update` | 從 GitHub 重新安裝最新版（唯一會連網的命令） |
| `maat help` | 列出每個命令與旗標 |
```

- [ ] 4. Run the focused tests; expect exit 0. Then run the whole suite; expect 0 failures (98 tests).

```sh
bun test tests/cli/main.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/cli/main.test.ts tests/skills/contracts.test.ts src/cli/args.ts src/cli/main.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md README.md docs/plans/maat-discoverability/01-help.md
git commit -m '✨ feat(cli): add maat help and point the skill to the formats it needs'
```
