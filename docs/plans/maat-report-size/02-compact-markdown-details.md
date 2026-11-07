# R02 — Summarize item details in the Markdown report

Owner decision 2026-11-07, after three clean skill runs on fvg: the Markdown report was 2.10 MB and 2.58 MB, with one line of 912 K characters, so every agent fell back to `jq` on the JSON report. The cause is the "Item details" section of `renderReport` in `src/report/index.ts`: each table cell holds the full canonical JSON of the item's observations, assessments and attestations. On fvg, `context-size-reported@1` and `documents.local-links@1` produce 1686 observations each (one per document) and all of them land in the cells of four context items. The owner chose to keep the JSON report unchanged and make the Markdown cells summaries: per detector, the number of observations and the count of facts per status; assessments as claim and stance; attestations as ref and validity; claims and prerequisites as name and status; applicability as its status. Measured with a prototype on the run-3 fvg report: 2.58 MB to 34 KB, longest item line 208 characters.

Owner rule: over-design is forbidden. Change only the item details rendering, one spec sentence, and one test.

## Files

- Create: None.
- Modify: `tests/report/render.test.ts`, `src/report/index.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/report/render.test.ts`.

## Interfaces

Consumes:

```ts
// src/models.ts
export interface ItemResult { observations: Observation[]; assessments: Assessment[]; attestations: {ref:string;valid:boolean;invalid_reason:string|null}[]; claims: Claim[]; prerequisites: {required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]}; /* ... */ }
```

Produces: None (`renderReport(r: Report): string` keeps its signature).

## Steps

- [ ] 1. Write the failing test. In `tests/report/render.test.ts`, replace

```ts
 expect(Object.keys(r.adapters[0]!)).not.toContain("sources");expect(Object.keys(r.adapters[0]!)).not.toContain("observations");
});
```

  with

```ts
 expect(Object.keys(r.adapters[0]!)).not.toContain("sources");expect(Object.keys(r.adapters[0]!)).not.toContain("observations");
});
test("item details count observations instead of copying evidence",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p,[]);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const ev={path:"a.md",sha256:"a".repeat(64),lines:"1-2"};
 const fact=(status:"holds"|"unknown")=>({subject:"documents",claim:"lines",status,scope:{},basis:"2",complete:false});
 r.items[0]!.observations=[{detector:"d@1",version:1,scope:{},evidence:[ev],limits:[],facts:[fact("holds")],diagnostics:[]},
  {detector:"d@1",version:1,scope:{},evidence:[ev],limits:[],facts:[fact("unknown")],diagnostics:[]}];
 const md=renderReport(r);
 expect(md).toContain("| d@1 x2 (holds 1, unknown 1) | none | none |");
 expect(md).not.toContain("a".repeat(64));
 expect(md).toContain("full observations, claim basis and evidence are in the JSON report");
});
```

- [ ] 2. Run the focused test; expect exit 1 with `1 pass`, `1 fail`: the new test fails on `toContain("| d@1 x2 (holds 1, unknown 1) | none | none |")`.

```sh
bun test tests/report/render.test.ts
```

- [ ] 3. Implement.

  a. In `src/report/index.ts`, replace

```ts
import type { Report,Snapshot,Policy,ProtectionObservation,Assessment,Fingerprint } from "../models";
```

  with

```ts
import type { Report,Snapshot,Policy,ProtectionObservation,Assessment,Fingerprint,ItemResult } from "../models";
```

  b. In `src/report/index.ts`, replace

```ts
const cell=(v:unknown)=>canonical(v).replaceAll("|","\\|").replaceAll("\n"," ");
```

  with

```ts
const text=(s:string)=>s.replaceAll("|","\\|").replaceAll("\n"," ");
const cell=(v:unknown)=>text(canonical(v));
const listed=(xs:string[])=>xs.length?text(xs.join("; ")):"none";
function observationCounts(i:ItemResult):string {
 const groups=new Map<string,{count:number;status:Record<string,number>}>();
 for(const o of i.observations) {
  const g=groups.get(o.detector)??{count:0,status:{}};g.count++;
  for(const f of o.facts)g.status[f.status]=(g.status[f.status]??0)+1;
  groups.set(o.detector,g);
 }
 return listed([...groups].map(([d,g])=>d+" x"+g.count+" ("+(Object.entries(g.status).sort().map(([k,n])=>k+" "+n).join(", ")||"no facts")+")"));
}
```

  c. In `src/report/index.ts`, replace

```ts
 lines.push("","## Item details","","| Item / scope / result | Machine observations | Agent assessments | User attestations |","|---|---|---|---|");
 for(const i of r.items) lines.push("| "+[i.id+" "+cell(i.scope)+" "+i.result,cell(i.observations),cell(i.assessments),cell(i.attestations)].join(" | ")+" |",
 "\nClaims: "+cell(i.claims)+"; applicability: "+cell(i.applicability)+"; prerequisites: "+cell(i.prerequisites)+"; diagnostics: "+cell(i.diagnostics)+"\n");
```

  with

```ts
 lines.push("","## Item details","","Counts per detector and fact status; full observations, claim basis and evidence are in the JSON report (--json or --out).","",
 "| Item / scope / result | Machine observations | Agent assessments | User attestations |","|---|---|---|---|");
 for(const i of r.items) lines.push("| "+[i.id+" "+cell(i.scope)+" "+i.result,observationCounts(i),
 listed(i.assessments.map(a=>a.claim+" "+a.stance)),
 listed(i.attestations.map(a=>"#"+a.ref+" "+(a.valid?"valid":"invalid "+a.invalid_reason)))].join(" | ")+" |",
 "\nClaims: "+listed(i.claims.map(x=>x.name+" "+x.status))+"; applicability: "+i.applicability.status+"; prerequisites: "+
 listed([...i.prerequisites.required,...i.prerequisites.recommended].map(x=>x.capability+" "+x.status))+"; diagnostics: "+cell(i.diagnostics)+"\n");
```

  d. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.2, replace

```text
順序：摘要（逐層狀態、必要能力缺口、待確認數）→ 每層的基本項缺口與進階發現 → 逐題明細（結果、三類證據分欄）→ 保護觀察 → 範圍與限制 → 版本。摘要先顯示（U-1）。
```

  with

```text
順序：摘要（逐層狀態、必要能力缺口、待確認數）→ 每層的基本項缺口與進階發現 → 逐題明細（結果、三類證據分欄）→ 保護觀察 → 範圍與限制 → 版本。摘要先顯示（U-1）。逐題明細只放摘要：機器觀察列每個 detector 的觀察數與各事實狀態的數量，代理評估列主張與立場，使用者確認列編號與是否有效，主張與前提能力列名稱與狀態，適用性只列狀態；完整觀察、主張依據與證據只在 JSON 報告（使用者 2026-11-07 決定，fvg 的 Markdown 報告原本超過 2 MB）。
```

- [ ] 4. Run the focused test; expect exit 0 and 2 passing tests. Then run the whole suite; expect `109 pass`, `0 fail`.

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
git add -- tests/report/render.test.ts src/report/index.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-report-size/02-compact-markdown-details.md
git commit -m '🐛 fix(report): summarize item details in the Markdown report'
```
