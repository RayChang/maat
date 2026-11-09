# D03 — Refuse templates for steps the flow cannot take yet, and document step order and the evaluation file

Run 3 of the improve skill on a copy of fvg (2026-11-09): after action A1's change was recorded, `maat flow template --step before --action <A2>` printed a template without complaint, but submitting it was rejected `illegal_before`, and the rejected event stayed in the ledger (resubmitting the same file gave `duplicate_event`). The flow runs one action at a time (before checkpoint, change, after checkpoint, change record, evaluation) and `accept` is one decision for the whole flow that reads each action's latest evaluation; the improve skill says neither. The evaluation file's allowed `result` values, the `method` shape and the fact that `report` must be the whole report object were found only by trial. Owner decision (2026-11-09): document it in the skill, and make the template refuse a step the flow cannot take yet. The fix adds the same state conditions the reducer uses for `before`, `after` and `evaluation` to `flowTemplate`, failing with exit 4 and `flow_rejected: <reason> (<what to record first>)` before anything is read or written, and adds one paragraph to the improve skill. The existing symlink test moves to the point where an after template is legal.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: None.
- Modify: `tests/e2e/flow-template.test.ts`, `src/flow/template.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-template.test.ts`.

## Interfaces

Consumes:

```ts
export declare function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Make four edits.

  a. In `tests/e2e/flow-template.test.ts`, replace

```ts
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
```

  with

```ts
  await mkdir(join(repo,"docs"));await symlink(join(repo,"README.md"),join(repo,"docs/task.md"));
  expect((await main(["flow","template","--step","after","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("repository_read: docs/task.md");
  await rm(join(repo,"docs/task.md"));await writeFile(join(repo,"docs/task.md"),action.template.body);
```

  b. In `tests/e2e/flow-template.test.ts`, replace

```ts
  await rm(join(repo,"docs/task.md"));await symlink(join(repo,"README.md"),join(repo,"docs/task.md"));
  expect((await main(["flow","template","--step","after","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("repository_read: docs/task.md");
```

  with

```ts
  const early=await main(["flow","template","--step","before","--action",action.id,"--flow",id,"--ledger",ledger],time);
  expect([early.code,early.stderr]).toEqual([4,expect.stringContaining("flow_rejected: illegal_before (status changed; record the evaluation of the changed action first)")]);
```

  c. In `tests/e2e/flow-template.test.ts`, replace

```ts
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
```

  with

```ts
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
  expect((await main(["flow","template","--step","after","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("flow_rejected: illegal_after (status approved; record the before checkpoint of "+action.id+" first)");
```

  d. In `tests/e2e/flow-template.test.ts`, replace

```ts
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",before)])).status).toBe("executing");
```

  with

```ts
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",before)])).status).toBe("executing");
  expect((await main(["flow","template","--step","evaluation","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("flow_rejected: evaluation_state (status executing; action "+action.id+" is still open: record its after checkpoint and change first)");
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the first new assertion, the after template in status `approved`, fails because the template prints an event instead of refusing it.

```sh
bun test tests/e2e/flow-template.test.ts
```

- [ ] 3. Implement. Make this edit. The "replace" text occurs exactly once in the file.

  a. In `src/flow/template.ts`, replace

```ts
 let payload:Record<string,unknown>;
 if(step==="approve") {
```

  with

```ts
 const open=f.pending?"; action "+f.pending.action+" is still open: record its "+(f.pending.after?"change":"after checkpoint and change")+" first":"";
 if(step==="before"&&(!["approved","evaluated"].includes(f.status)||f.pending))
  throw new MaatError(4,"flow_rejected: illegal_before (status "+f.status+(open||(f.status==="changed"?"; record the evaluation of the changed action first":""))+")");
 if(step==="after"&&(f.status!=="executing"||f.pending?.action!==action!.id||f.pending.after))
  throw new MaatError(4,"flow_rejected: illegal_after (status "+f.status+(open||(["approved","evaluated"].includes(f.status)?"; record the before checkpoint of "+action!.id+" first":""))+")");
 if(step==="evaluation"&&(!["changed","evaluated","approved"].includes(f.status)||f.pending))
  throw new MaatError(4,"flow_rejected: evaluation_state (status "+f.status+open+")");
 let payload:Record<string,unknown>;
 if(step==="approve") {
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `117 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-template.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Each anchor text occurs exactly once in its file and stays as it is.

  In `skills/maat-improve/SKILL.md`, directly after the sentence

```text
Record evaluation separately. Human declaration checks may use valid human evidence without running a command.
```

  insert this text on the same line (it begins with the space shown):

```text
 Finish one action before starting the next: before checkpoint, change, after checkpoint, change record, then its evaluation; maat flow template refuses a step the flow cannot take yet. In the evaluation file, result is one of pass, fail, unknown, error, timeout, cancel; method is {"kind": "manual" or "command", "id": "<text>", "version": "<text>"}; report is the whole JSON report of a fresh maat scan or maat evaluate of the current files, and a pass requires it; execution stays null for a manual method; unknown_effects is a list, empty when there are none. Accept is one decision for the whole flow: it reads each action's latest evaluation of the current files, so after attestations change, record a new evaluation for every action with a fresh report.
```

  Then, in `docs/specs/2026-11-04-maat-cli-interface.md`, directly after the text

```text
使用者沒核准的要刪掉（2026-11-09 補充）
```

  insert this text on the same line (it begins with the character shown):

```text
。流程現在還不能做的 `before`／`after`／`evaluation` 直接拒絕（結束代碼 4，`flow_rejected: <原因> (status <狀態>; <該先記錄的步驟>)`，只在確定時才附該先記錄的步驟），不讀檔也不寫入 ledger（2026-11-09 補充）
```

- [ ] 7. Run the whole suite again; expect `117 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-template.test.ts src/flow/template.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-flow-messages/03-step-order.md
git commit -m '📝 feat(flow): refuse templates for steps the flow cannot take yet'
```

Cloud review of PR #82 (2026-11-09), must-fix applied: each refusal adds the step to record first only when that hint is right for the current state (an open action, status `changed` for before, status `approved` or `evaluated` for after); otherwise it gives the status alone. Two assertions pin the after and evaluation refusals.
