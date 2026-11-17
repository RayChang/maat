# V01 — Print one command's usage with --help

Lottery run 3 (2026-11-11): the agent ran `maat scan --help`, `maat policy validate --help`, and `maat evaluate --help`; each one failed with a usage error, and it had to read the whole `maat help` list and guess that `scan --snapshot <file>` writes a snapshot while `evaluate --snapshot` reads one.

Rules of the change:
- If any argument is `--help` or `-h`, maat prints the usage of the named command only and exits 0. The command name is the first argument, or the first two when the first is a command group (`catalog`, `policy`, `attest`, `flow`) and the second is not a flag. With no command (`maat --help`), it prints the full list, like `maat help`.
- `maat help <command>` does the same; `maat help flow` lists every `flow` command.
- An unknown command name keeps the existing message `usage_error: unknown command (run maat help)` (exit 2).
- The global flag lines are printed after every usage, plus one new line: `maat scan --snapshot <file> writes the snapshot to that file; evaluate, policy validate, and flow open read it.`

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/cli/main.test.ts` (append), `src/cli/args.ts`, `src/cli/main.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/cli/main.test.ts`.

## Interfaces

Consumes:

```ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>; // src/cli/main.ts
```

Produces: `usage(name?: string): string` in `src/cli/args.ts` (the parameter is new; calling it without an argument behaves as before).

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/cli/main.test.ts` (the file ends with a newline; add nothing else):

```ts
test("--help after a command, -h, and maat help <command> print that command's usage",async()=>{
 for(const argv of [["scan","--help"],["scan","-h"],["help","scan"],["scan","/repo","--cli","codex","--help"]]) {
  const r=await main(argv);
  expect(r.code).toBe(0);
  expect(r.stdout.split("\n")[0]).toBe("maat scan [<arg>] [--cli <claude-code|codex|copilot> ...] [--policy <value>] [--evidence <value> ...] [--snapshot <value>] [--format <markdown|json|both>]");
  expect(r.stdout).not.toContain("maat evaluate");
  expect(r.stdout).toContain("Global flags: [--json]");
  expect(r.stdout).toContain("maat scan --snapshot <file> writes the snapshot to that file; evaluate, policy validate, and flow open read it.");
 }
 const flow=await main(["flow","--help"]);
 const commands=flow.stdout.slice(0,flow.stdout.indexOf("\nGlobal flags:")).split("\n");
 expect(commands).toHaveLength(9);
 expect(commands.every(l=>l.startsWith("maat flow "))).toBe(true);
 expect(flow.stdout).toContain("maat flow approve --flow <value> --scope <value> --by <value>");
 expect((await main(["help","nope"])).stderr).toBe("usage_error: unknown command (run maat help)\n");
 expect((await main(["nope","--help"])).stderr).toBe("usage_error: unknown command (run maat help)\n");
});
```

- [ ] 2. Run the focused test; expect exit 1 with `4 pass`, `1 fail`: `maat scan --help` is still a usage error.

```sh
bun test tests/cli/main.test.ts
```

- [ ] 3. Implement. Make these 6 edits. Each "replace" text occurs exactly once in its file. Edits a to e are in `src/cli/args.ts`; edit f is in `src/cli/main.ts`.

  a. In `src/cli/args.ts`, replace

```ts
version: { flags: [] }, update: { flags: [] }, help: { flags: [] }
```

  with

```ts
version: { flags: [] }, update: { flags: [] }, help: { flags: [], max: 2 }
```

  b. In `src/cli/args.ts`, replace

```ts
export function usage(): string {
```

  with

```ts
export function usage(name?: string): string {
```

  c. In `src/cli/args.ts`, replace

```ts
  return Object.entries(grammar).map(([c, s]) => "maat " + c + arg(s)
```

  with

```ts
  const shown = Object.entries(grammar).filter(([c]) => !name || c === name || c.startsWith(name + " "));
  if (!shown.length) throw new MaatError(2, "usage_error: unknown command (run maat help)");
  return shown.map(([c, s]) => "maat " + c + arg(s)
```

  d. In `src/cli/args.ts`, replace

```ts
    + "maat flow list lists the flows of the repository that contains the current directory.\n";
```

  with

```ts
    + "maat scan --snapshot <file> writes the snapshot to that file; evaluate, policy validate, and flow open read it.\n"
    + "maat flow list lists the flows of the repository that contains the current directory.\n";
```

  e. In `src/cli/args.ts`, replace

```ts
export function parseArgs(argv: string[]): Args {
```

  with

```ts
export function parseArgs(argv: string[]): Args {
  // `maat <command> ... --help` (or -h) prints the usage of that command only.
  if (argv.some(w => w === "--help" || w === "-h")) {
    const [first, second] = argv.filter(w => w !== "--help" && w !== "-h");
    const name = ["catalog","policy","attest","flow"].includes(first ?? "") && second && !second.startsWith("-") ? first + " " + second : first;
    return { command: "help", positionals: name ? [name] : [], flags: {} };
  }
```

  f. In `src/cli/main.ts`, replace

```ts
if(a.command==="help")return {code:0,stdout:usage(),stderr:""};
```

  with

```ts
if(a.command==="help")return {code:0,stdout:usage(a.positionals.join(" ")||undefined),stderr:""};
```

- [ ] 4. Run the focused test; expect exit 0 and `5 pass`. Then run the whole suite; expect `130 pass`, `0 fail`.

```sh
bun test tests/cli/main.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file. Edit b adds a new line after the existing `maat help` line inside the spec's command block.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
Run maat help for every command and flag.
```

  with

```text
Run maat help for every command and flag; maat <command> --help shows one command.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
maat help                         列出每個命令、位置參數與旗標；用法錯誤的訊息也會提示執行它（2026-11-06 補充）
```

  with

```text
maat help                         列出每個命令、位置參數與旗標；用法錯誤的訊息也會提示執行它（2026-11-06 補充）
maat help <命令>、maat <命令> --help 或 -h   只列那個命令；命令群組（例如 flow）列出群組內每個命令（2026-11-12 補充）
```

- [ ] 7. Run the whole suite again; expect `130 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/cli/main.test.ts src/cli/args.ts src/cli/main.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-command-help/01-command-help.md
git commit -m '✨ feat(cli): print one command usage with --help'
```
