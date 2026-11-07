# R03 — Make the Markdown summary say what is missing

Owner decision 2026-11-07, after three clean skill runs on fvg: every agent read the summary as contradictory. A layer showed `ready` with `Required gaps []`, while "Layer findings" listed three to six baseline gaps for it. `ready` means the prerequisites hold but baseline gaps remain (tool spec §5.3), yet the summary never says so and never lists those gaps. The `Required gaps` column shows `missing_required`, which lists prerequisites only; readers took it for missing items. The blocking codes `worker_evaluation_requirement` and `conditional_evaluation_requirement` are not explained anywhere, and `maat explain` answers `unknown_id` for them. "Pending items: 53" mixed baseline and advanced items. The owner chose to fix only the Markdown summary; the JSON report and the layer states stay unchanged:

- a one-line legend of the states;
- a `Baseline gaps` column;
- the prerequisite columns renamed to `Missing prerequisites` and `Unconfirmed prerequisites`;
- one line per prerequisite code in use, saying what clears it (from `src/evaluate/layers.ts`);
- the unknown-item count split into baseline and advanced.

Measured with a prototype on the run-3 fvg scan: every `ready` row now lists its gaps next to the state.

Owner rule: over-design is forbidden. Change only the summary rendering, one spec sentence, and one test.

## Files

- Create: None.
- Modify: `tests/report/render.test.ts`, `src/report/index.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/report/render.test.ts`.

## Interfaces

Consumes:

```ts
// src/models.ts
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
// src/report/index.ts (already present)
const listed=(xs:string[])=>xs.length?text(xs.join("; ")):"none";
```

Produces: None (`renderReport(r: Report): string` keeps its signature).

## Steps

- [ ] 1. Write the failing test. In `tests/report/render.test.ts`, replace

```ts
 expect(md).toContain("full observations, claim basis and evidence are in the JSON report");
});
```

  with

```ts
 expect(md).toContain("full observations, claim basis and evidence are in the JSON report");
});
test("the summary lists baseline gaps and explains states and prerequisites",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p,[]);
 const md=renderReport(buildReport(s,p,c,"2026-11-04T00:00:00Z"));
 const summary=md.slice(md.indexOf("## Summary"),md.indexOf("## Layer findings"));
 expect(summary).toContain("ready = prerequisites hold but baseline gaps remain");
 expect(summary).toContain("| Layer / scope | State | Baseline gaps | Missing prerequisites | Unconfirmed prerequisites |");
 expect(summary).toContain("| prompt {} | pending | prompt.output-contract; prompt.task-spec | none | none |");
 expect(summary).toContain("- worker_evaluation_requirement: a verification entrypoint must be declared and documented in this scope");
 expect(summary).toMatch(/Items without a result: \d+ \(baseline \d+, advanced \d+\)/);
});
```

- [ ] 2. Run the focused test; expect exit 1 with `2 pass`, `1 fail`: the new test fails on `toContain("ready = prerequisites hold but baseline gaps remain")`.

```sh
bun test tests/report/render.test.ts
```

- [ ] 3. Implement.

  a. In `src/report/index.ts`, replace

```ts
const listed=(xs:string[])=>xs.length?text(xs.join("; ")):"none";
```

  with

```ts
const listed=(xs:string[])=>xs.length?text(xs.join("; ")):"none";
const prerequisiteNotes:Record<string,string>={
 worker_evaluation_requirement:"a verification entrypoint must be declared and documented in this scope (verify.entrypoint-declared@1, verify.entrypoint-documented@1)",
 conditional_evaluation_requirement:"an evaluation config must be declared in this scope (evaluation.config-declared@1)"};
```

  b. In `src/report/index.ts`, replace

```ts
 const lines=["# maat audit report","","## Summary","",
 "| Layer / scope | State | Required gaps | Unknown requirements |","|---|---|---|---|"];
 for(const l of r.layers) lines.push("| "+[l.layer+" "+cell(l.scope),l.status,cell(l.missing_required),cell(l.unknown_required)].join(" | ")+" |");
 lines.push("","Pending items: "+r.items.filter(i=>i.result==="unknown").length,
 "Authoritative: "+r.layers.every(l=>l.authoritative),"","## Layer findings","");
```

  with

```ts
 const lines=["# maat audit report","","## Summary","",
 "States: adopted = baseline items met; ready = prerequisites hold but baseline gaps remain; blocked = a prerequisite is missing or unconfirmed; in_use_unsupported = in use while blocked; pending = applicability not decided; not_applicable = declared not applicable.","",
 "| Layer / scope | State | Baseline gaps | Missing prerequisites | Unconfirmed prerequisites |","|---|---|---|---|---|"];
 for(const l of r.layers) lines.push("| "+[l.layer+" "+cell(l.scope),l.status,listed(l.baseline_gaps),listed(l.missing_required),listed(l.unknown_required)].join(" | ")+" |");
 const codes=[...new Set(r.layers.flatMap(l=>[...l.missing_required,...l.unknown_required]))].sort();
 if(codes.length)lines.push("",...codes.map(x=>"- "+x+": "+(prerequisiteNotes[x]??"see maat explain "+x)));
 const pending=r.items.filter(i=>i.result==="unknown");
 lines.push("","Items without a result: "+pending.length+" (baseline "+pending.filter(i=>i.baseline.tier==="baseline").length+", advanced "+pending.filter(i=>i.baseline.tier==="advanced").length+")",
 "Authoritative: "+r.layers.every(l=>l.authoritative),"","## Layer findings","");
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.2, replace

```text
順序：摘要（逐層狀態、必要能力缺口、待確認數）→
```

  with

```text
順序：摘要（一行狀態說明；逐層狀態、基本項缺口、缺少與待確認的前提能力；每個用到的前提代碼一行說明怎麼成立；尚無結果的題數，分基本與進階；2026-11-07 補充）→
```

- [ ] 4. Run the focused test; expect exit 0 and 3 passing tests. Then run the whole suite; expect `110 pass`, `0 fail`.

```sh
bun test tests/report/render.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/report/render.test.ts src/report/index.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-report-size/03-clear-summary.md
git commit -m '🐛 fix(report): list baseline gaps and explain states in the summary'
```
