# X02 — Use a generic answer example in the diagnose skill

Cloud review of X01 (PR #114, 2026-11-17): the answer example in `skills/maat-diagnose/SKILL.md` names `package.json line 11` and `AGENTS.md lines 85-87`, which come from one project (alibi). An agent diagnosing another project may copy those line numbers.

Rules of the change: the example names the files without line numbers and tells the agent to cite the real line ranges in the materials. One contract test checks the new wording.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/skills/contracts.test.ts` (append), `skills/maat-diagnose/SKILL.md` (anchored edit).
- Test paths: `tests/skills/contracts.test.ts`.

## Interfaces

Consumes: `skills/maat-diagnose/SKILL.md` (text only).

Produces: None.

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/skills/contracts.test.ts` (the file ends with a newline; add nothing else):

```ts
test("diagnose skill's answer example names no project line numbers",async()=>{
 const diagnose=await Bun.file("skills/maat-diagnose/SKILL.md").text();
 expect(diagnose).toContain("for example: bun run test runs the unit tests (the test script in package.json), and AGENTS.md tells agents to run it before finishing; cite the real line ranges in the materials.");
});
```

- [ ] 2. Run the focused test; expect exit 1 with `2 pass`, `1 fail`: the skill still has the old example.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. Implement. Make this 1 edit in `skills/maat-diagnose/SKILL.md`; the "replace" text occurs exactly once in the file and is part of one existing line.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
for example: bun run test runs the unit tests (package.json line 11), and AGENTS.md lines 85-87 tell agents to run it before finishing.
```

  with

```text
for example: bun run test runs the unit tests (the test script in package.json), and AGENTS.md tells agents to run it before finishing; cite the real line ranges in the materials.
```

- [ ] 4. Run the focused test; expect exit 0 and `3 pass`. Then run the whole suite; expect `134 pass`, `0 fail`.

```sh
bun test tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/plans/maat-diagnose-wording/02-generic-example.md
git commit -m '📝 docs(skills): use a generic answer example in the diagnose skill'
```
