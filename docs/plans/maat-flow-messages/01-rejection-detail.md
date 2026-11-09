# D01 — Say which action and which condition a rejection is about

Run 3 of the improve skill on a copy of fvg (2026-11-09) finished, but the host agent lost time on three bare error messages. `flow decide --event accept` returned only `flow_rejected: non_authoritative_report` while every layer of the current report was authoritative; the host had to simulate on a copy of the ledger to learn that the latest evaluation of one action embedded a report whose policy was invalid (stale attestations). Evaluation event shape errors returned only a JSON path such as `schema_error: $.result`. `maat policy validate` returned `policy_invalid: fingerprint_mismatch` without saying which attestation. Owner decision (2026-11-09): make rejections say which item and which condition. The fix keeps every reason code unchanged (tests, ledgers and `last_rejection` still see the bare code) and adds detail: an accept rejection carries `detail` = `<action id>: <condition>`, which the CLI prints in parentheses after the code; `checkShape` appends what was expected (`missing <key>`, `expected one of [...]`, `expected <type>`, `unexpected key <key>`, ...); `policy validate` prefixes each issue with `attestations[<index>] <check>` or `exemptions[<index>]`.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/schema-errors.test.ts`.
- Modify: `tests/cli/inspect.test.ts`, `tests/flow/checkpoints.test.ts`, `src/flow/reducer.ts`, `src/flow/types.ts`, `src/cli/flow.ts`, `src/schema.ts`, `src/cli/inspect.ts` (anchored edits).
- Test paths: `tests/schema-errors.test.ts`, `tests/cli/inspect.test.ts`, `tests/flow/checkpoints.test.ts`.

## Interfaces

Consumes:

```ts
export declare function reduceFlow(original:Flow,e:FlowEvent):Transition;
export declare function checkShape(v:unknown,s:Shape,path?:string):void;
```

Produces:

```ts
// src/flow/types.ts
export interface Transition { flow:Flow;accepted:boolean;reason:string|null;detail?:string|null; }
```

## Steps

- [ ] 1. Write the failing tests. Make four changes.

  a. Create `tests/schema-errors.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { checkShape } from "../src/schema";
test("schema errors name the path and what was expected",()=>{
 const shape={type:"object" as const,required:["result"],properties:{result:{enum:["pass","fail"]},by:{type:"string" as const,minLength:1}},additionalProperties:false};
 expect(()=>checkShape({},shape)).toThrow("schema_error: $ missing result");
 expect(()=>checkShape({result:"verified"},shape)).toThrow('schema_error: $.result expected one of ["pass","fail"]');
 expect(()=>checkShape({result:"pass",by:1},shape)).toThrow("schema_error: $.by expected string");
 expect(()=>checkShape({result:"pass",extra:1},shape)).toThrow("schema_error: $ unexpected key extra");
});
```

  b. In `tests/cli/inspect.test.ts`, replace

```ts
rejects.toThrow("fingerprint_mismatch");
```

  with

```ts
rejects.toThrow("policy_invalid: attestations[0] prompt.task-spec fingerprint_mismatch");
```

  c. In `tests/flow/checkpoints.test.ts`, replace

```ts
  expect(reduceFlow(f,flowEvent(f,"accept",{})).reason).toBe("target_not_verified");
```

  with

```ts
  expect(reduceFlow(f,flowEvent(f,"accept",{}))).toMatchObject({reason:"target_not_verified",detail:"a: latest evaluation is not a pass with a report and no unknown effects"});
```

  d. Append this text to the end of `tests/flow/checkpoints.test.ts` (after its last line):

```ts
test("a rejected accept names the action and the invalid policy of its latest report",async()=>{
 let f=approve(flowFixture());const record=await passRecord(f);
 const report={...record.report!,policy:{...record.report!.policy,valid:false,diagnostics:["fingerprint_mismatch"]}};
 f=reduceFlow(f,flowEvent(f,"evaluation",{...record,report})).flow;
 expect(reduceFlow(f,flowEvent(f,"accept",{}))).toMatchObject({reason:"non_authoritative_report",detail:"a: latest evaluation report has an invalid policy: fingerprint_mismatch"});
});
```

- [ ] 2. Run the three focused test files; expect exit 1 with `7 pass`, `4 fail`. The failures: the schema test gets the bare `schema_error: $` message; the inspect test gets `policy_invalid: fingerprint_mismatch` without the attestation index; both checkpoint tests get a transition with no `detail`.

```sh
bun test tests/schema-errors.test.ts tests/cli/inspect.test.ts tests/flow/checkpoints.test.ts
```

- [ ] 3. Implement. Make these 7 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/flow/reducer.ts`, replace

```ts
   const guard=actionGuard(f,action,e.at);if(guard)return guard;
   const r=[...f.evaluations].reverse().find(r=>r.action===action.id&&r.candidate_fingerprint===fingerprintSet(f.current));
   if(!r || r.result!=="pass" || !r.report || r.unknown_effects.length)return "target_not_verified";
   if(r.method.kind==="command"&&(!r.execution||executionGuard(f,r.execution,e.at)))return "execution_not_authorized";
   if(r.report.valid_until&&Date.parse(r.report.valid_until)<=Date.parse(e.at))return "evidence_expired";
   if(canonical(reportVersionBinding(r.report))!==canonical(f.plan.versions))return "version_changed";
   if(!r.report.policy.valid||r.report.layers.some(l=>!l.authoritative))return "non_authoritative_report";
   const item=r.report.items.find(i=>i.id===action.check&&canonical(i.scope)===canonical(action.scope));
   if(!item||item.result!=="verified"||item.item_version!==action.item_version||
    item.prerequisites.required.some(x=>x.status!=="holds")||item.attestations.some(a=>!a.valid))return "target_not_verified";
```

  with

```ts
   const at=(reason:string,why:string)=>reason+"\n"+action.id+": "+why;
   const guard=actionGuard(f,action,e.at);if(guard)return at(guard,"approval check");
   const r=[...f.evaluations].reverse().find(r=>r.action===action.id&&r.candidate_fingerprint===fingerprintSet(f.current));
   if(!r)return at("target_not_verified","no evaluation for the current candidate");
   if(r.result!=="pass" || !r.report || r.unknown_effects.length)return at("target_not_verified","latest evaluation is not a pass with a report and no unknown effects");
   if(r.method.kind==="command"&&(!r.execution||executionGuard(f,r.execution,e.at)))return at("execution_not_authorized","evaluation command");
   if(r.report.valid_until&&Date.parse(r.report.valid_until)<=Date.parse(e.at))return at("evidence_expired","report valid_until "+r.report.valid_until);
   if(canonical(reportVersionBinding(r.report))!==canonical(f.plan.versions))return at("version_changed","report versions differ from the plan");
   if(!r.report.policy.valid)return at("non_authoritative_report","latest evaluation report has an invalid policy: "+r.report.policy.diagnostics.join(","));
   if(r.report.layers.some(l=>!l.authoritative))return at("non_authoritative_report","latest evaluation report layers not authoritative: "+r.report.layers.filter(l=>!l.authoritative).map(l=>l.layer).join(","));
   const item=r.report.items.find(i=>i.id===action.check&&canonical(i.scope)===canonical(action.scope));
   if(!item||item.result!=="verified"||item.item_version!==action.item_version||
    item.prerequisites.required.some(x=>x.status!=="holds")||item.attestations.some(a=>!a.valid))
    return at("target_not_verified","report item is "+(item?item.result+(item.attestations.some(a=>!a.valid)?" with invalid attestations":""):"missing"));
```

  b. In `src/flow/reducer.ts`, replace

```ts
  if(typeof next==="string")reason=next;
 }
```

  with

```ts
  if(typeof next==="string")reason=next;
 }
 const [code,detail]=(reason??"").split("\n");reason=code||null;
```

  c. In `src/flow/reducer.ts`, replace

```ts
 return {flow:f,accepted:!reason,reason};
```

  with

```ts
 return {flow:f,accepted:!reason,reason,detail:detail??null};
```

  d. In `src/flow/types.ts`, replace

```ts
export interface Transition { flow:Flow;accepted:boolean;reason:string|null; }
```

  with

```ts
export interface Transition { flow:Flow;accepted:boolean;reason:string|null;detail?:string|null; }
```

  e. In `src/cli/flow.ts`, replace

```ts
if(!t.accepted)throw new MaatError(4,"flow_rejected: "+t.reason);
```

  with

```ts
if(!t.accepted)throw new MaatError(4,"flow_rejected: "+t.reason+(t.detail?" ("+t.detail+")":""));
```

  f. In `src/schema.ts`, replace

```ts
 const fail=():never=>{throw new MaatError(3,"schema_error: "+path);};
 if(s.enum && !s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))) fail();
 if(s.type==="array") {
  if(!Array.isArray(v) || v.length<(s.minItems??0)) fail();
  (v as unknown[]).forEach((x,i)=>checkShape(x,s.items??{},path+"["+i+"]"));return;
 }
 if(s.type==="object") {
  if(!v || typeof v!=="object" || Array.isArray(v)) fail();
  const o=v as Record<string,unknown>;
  for(const k of s.required??[]) if(!(k in o)) fail();
  for(const [k,x] of Object.entries(o)) {
   if(["__proto__","constructor","prototype"].includes(k)) fail();
   const child=s.properties?.[k];
   if(child) checkShape(x,child,path+"."+k);
   else if(s.additionalProperties===false) fail();
   else if(typeof s.additionalProperties==="object") checkShape(x,s.additionalProperties,path+"."+k);
  }
  return;
 }
 if(s.type && typeof v!==s.type) fail();
 if(typeof v==="number" && !Number.isFinite(v)) fail();
 if(typeof v==="string" && (v.length<(s.minLength??0) || (s.pattern && !new RegExp(s.pattern).test(v)))) fail();
```

  with

```ts
 const fail=(why:string):never=>{throw new MaatError(3,"schema_error: "+path+" "+why);};
 if(s.enum && !s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))) fail("expected one of "+JSON.stringify(s.enum));
 if(s.type==="array") {
  if(!Array.isArray(v) || v.length<(s.minItems??0)) fail("expected array"+(s.minItems?" of at least "+s.minItems:""));
  (v as unknown[]).forEach((x,i)=>checkShape(x,s.items??{},path+"["+i+"]"));return;
 }
 if(s.type==="object") {
  if(!v || typeof v!=="object" || Array.isArray(v)) fail("expected object");
  const o=v as Record<string,unknown>;
  for(const k of s.required??[]) if(!(k in o)) fail("missing "+k);
  for(const [k,x] of Object.entries(o)) {
   if(["__proto__","constructor","prototype"].includes(k)) fail("reserved key "+k);
   const child=s.properties?.[k];
   if(child) checkShape(x,child,path+"."+k);
   else if(s.additionalProperties===false) fail("unexpected key "+k);
   else if(typeof s.additionalProperties==="object") checkShape(x,s.additionalProperties,path+"."+k);
  }
  return;
 }
 if(s.type && typeof v!==s.type) fail("expected "+s.type);
 if(typeof v==="number" && !Number.isFinite(v)) fail("expected finite number");
 if(typeof v==="string" && (v.length<(s.minLength??0) || (s.pattern && !new RegExp(s.pattern).test(v)))) fail(s.pattern?"expected string matching "+s.pattern:"expected non-empty string");
```

  g. In `src/cli/inspect.ts`, replace

```ts
  const issues=p.attestations.flatMap(x=>attestationIssues(x,materials,s?s.versions:versions,x.scope,now));
  for(const e of p.exemptions)if(!decisionValid(e,now)||!e.fingerprints.length||!e.fingerprints.every(f=>materials.some(m=>m.path===f.path&&m.sha256===f.sha256)))issues.push("invalid_exemption");
```

  with

```ts
  const issues=p.attestations.flatMap((x,i)=>attestationIssues(x,materials,s?s.versions:versions,x.scope,now).map(r=>"attestations["+i+"] "+x.check+" "+r));
  p.exemptions.forEach((e,i)=>{if(!decisionValid(e,now)||!e.fingerprints.length||!e.fingerprints.every(f=>materials.some(m=>m.path===f.path&&m.sha256===f.sha256)))issues.push("exemptions["+i+"] invalid_exemption");});
```

- [ ] 4. Run the focused tests; expect exit 0 and `11 pass`. Then run the whole suite; expect `116 pass`, `0 fail`.

```sh
bun test tests/schema-errors.test.ts tests/cli/inspect.test.ts tests/flow/checkpoints.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/schema-errors.test.ts tests/cli/inspect.test.ts tests/flow/checkpoints.test.ts src/flow/reducer.ts src/flow/types.ts src/cli/flow.ts src/schema.ts src/cli/inspect.ts docs/plans/maat-flow-messages/01-rejection-detail.md
git commit -m '💬 feat(flow): say which action and condition a rejection is about'
```
