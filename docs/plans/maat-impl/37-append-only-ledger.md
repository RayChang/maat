# T37 — Persist atomic JSONL ledgers with exclusive locks and replay validation

DECISION (implementer default): directory precedence is --ledger, MAAT_STATE_DIR, XDG_STATE_HOME/maat/<repo-id>, then the macOS or Linux user-state fallback. Overrides select the exact directory, always outside the target. Generated flow IDs prefix repo-id so lookup does not depend on cwd. One JSONL file records the opening plan/base and later events with sequence, time, before/after state names, acceptance, and reason. Replay reconstructs counts and current state; rows do not duplicate full state and do not use a hash chain. Updates preserve old bytes, append via temporary file plus rename, and hold an exclusive lock file created atomically with its owner's pid and hostname. The owner chose automatic clearing because a crashed process otherwise leaves every later flow command failing with ledger_locked until the lock is deleted by hand. A lock whose owner is on this hostname and whose pid is no longer alive is cleared once, serialized by a <lock>.break file and only if its content is unchanged, then acquisition is retried; a lock that vanishes before it is read is retried once. Release removes the lock only if it still holds the content this process wrote. Any other lock is environment error 1, ledger_locked: a lock from another hostname, a reused pid that is alive, an unparseable lock (including empty lock files from before this rule), or a leftover <lock>.break is never cleared automatically and must be removed by hand. Stale clearing assumes a hostname identifies one pid namespace: do not share a state directory across containers that have the same hostname. The code blocks below are the original v1 implementation; a later follow-up superseded the lock code with owner-recorded locks, breaker-serialized stale clearing, and owner-checked release.

## Files

- Create: `src/flow/ledger.ts`.
- Modify: None.
- Test path: `tests/flow/ledger.test.ts`.

## Interfaces

Consumes:

```ts
// T01
export declare const versions: Versions;
// T01
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
// T05
export declare function canonical(value: unknown): string;
// T05
export interface CapabilityResult { id:string;status:Truth;scope:Scope;basis:string[];claims:Claim[]; }
// T05
export interface Claim { name:string;status:Truth;basis:string[]; }
// T05
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
// T05
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export interface ItemResult {
 id:string;item_version:number;layer:Layer;scope:Scope;
 applicability:{status:Decision["status"];reason:string;questions:string[]};
 result:ItemStatus;claims:Claim[];observations:Observation[];assessments:Assessment[];
 attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
 prerequisites:{required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]};
 baseline:{tier:"baseline"|"advanced";when_status:Truth};diagnostics:string[];
}
// T05
export type ItemStatus = "verified"|"partial"|"missing"|"not_applicable"|"unknown";
// T05
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
// T05
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
// T05
export type LayerStatus = "adopted"|"ready"|"blocked"|"not_applicable"|"in_use_unsupported"|"pending";
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
// T05
export interface Policy {
 policy_schema:string; catalog_version:string; target_clis:string[];
 scope:{include:string[];exclude:string[]};
 applicability:Record<string,Decision>;
 targets:Record<string,{baseline?:boolean}>;
 exemptions:{check:string;reason:string;owner:string;expires_at:string;fingerprints:Fingerprint[];scope?:Scope}[];
 attestations:Attestation[];
}
// T05
export interface ProtectionObservation { measure:string;protects:string;threat:string;boundary:string;evidence:Evidence[];unknown:string[]; }
// T05
export declare function repoId(absolutePath: string): string;
// T05
export interface Report {
 report_schema:string;tool_version:string;catalog_version:string;adapters:(Omit<AdapterResult,"sources"|"observations"|"surfaces">&{surfaces:Omit<AdapterSurface,"paths">[]})[];
 generated_at:string;valid_until:string|null;repository:Snapshot["repository"];scope:Snapshot["scope"];target_clis:string[];
 policy:{path:string|null;policy_schema:string;valid:boolean;diagnostics:string[]};
 items:ItemResult[];capabilities:Omit<CapabilityResult,"claims">[];layers:LayerResult[];
 protection_observations:ProtectionObservation[];diagnostics:string[];
}
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
// T05
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
// T05
export type Truth = "holds"|"fails"|"unknown";
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T29
export declare function outsidePath(destination: string, repository: string): Promise<string>;
// T29
export declare function writeOutside(destination: string, text: string, repository: string): Promise<void>;
// T31
export interface Plan {
 report_schema:string;versions:Versions;catalog_version:string;repository:{path:string;repo_id:string};
 source_report_fingerprint:string;plan_fingerprint:string;actions:PlanAction[];
 fingerprints:Fingerprint[];authoritative:boolean;diagnostics:string[];
}
// T31
export interface PlanAction {
 id:string;check:string;scope:Scope;item_version:number;rule_cards:{id:string;version:number}[];
 template:{id:string;version:number;body:string}|null;current:string;target:string;
 kind:"ask"|"modify"|"command";actions:string[];target_path:string|null;command:string|null;
 depends_on:string[];necessity:"required"|"recommended";risk:string;needs_approval:boolean;
 role_approval_required:boolean;verification:{detectors:string[];expected:unknown;manual:string};
 fingerprints:Fingerprint[];fix_conditions:{max_fixes:number};stop_conditions:string[];
}
// T34
export interface Approval { plan_fingerprint:string;base_fingerprint:string;actions:string[];paths:string[];mode:"plan"|"candidate";candidate_fingerprint:string|null;max_fixes:Record<string,number>;role_approvals:{check:string;by:string}[];expires_at:string;by:string;source:string; }
// T34
export interface Authorization { execution:ExecutionSpec;expires_at:string;by:string;source:string; }
// T34
export interface ChangeRecord { action:string;candidate_fingerprint:string;paths:string[];executed_by:string;source:string;unknown_effects:string[]; }
// T34
export interface EvaluationRecord { action:string;candidate_fingerprint:string;method:{kind:"manual"|"command";id:string;version:string};result:"pass"|"fail"|"unknown"|"error"|"timeout"|"cancel";report:Report|null;execution:ExecutionSpec|null;evidence:Fingerprint[];by:string;source:string;unknown_effects:string[]; }
// T34
export interface ExecutionSpec { action:string;command:string;script:Fingerprint|null;inputs:Fingerprint[];cwd:string;permissions:string[];effects:string[]; }
// T34
export declare function fingerprintSet(fingerprints: Fingerprint[]): string;
// T34
export interface Flow {
 ledger_schema:string;flow_id:string;repository:{path:string;repo_id:string};plan:Plan;plan_fingerprint:string;
 status:FlowStatus;seq:number;seen:string[];current:Fingerprint[];base:Fingerprint[];
 approval:Approval|null;authorizations:Authorization[];fixes:Record<string,number>;attempts:Record<string,number>;
 pending:{action:string;before:Fingerprint[];after:Fingerprint[]|null;execution:ExecutionSpec|null}|null;
 changes:ChangeRecord[];evaluations:EvaluationRecord[];meaningful_inputs:string[];
 unknown_effects:string[];last_rejection:string|null;resume_permit:boolean;
}
// T34
export interface FlowEvent { id:string;expected_seq:number;at:string;expires_at:string;type:"approve"|"authorize"|"before"|"after"|"change"|"evaluation"|"accept"|"continue-fix"|"stop"|"handoff"|"resume";by:string;payload:unknown; }
// T34
export type FlowStatus="open"|"approved"|"executing"|"changed"|"evaluated"|"accepted"|"stopped"|"handoff"|"drifted";
// T34
export interface LedgerRow { ledger_schema:string;seq:number;at:string;before:FlowStatus|null;after:FlowStatus;event:FlowEvent|{type:"open";id:string;plan:Plan;fingerprints:Fingerprint[]};accepted:boolean;reason:string|null; }
// T34
export declare function openFlow(id: string, plan: Plan, snapshot: Pick<Snapshot, 'repository' | 'materials'>): Flow;
// T34
export interface Transition { flow:Flow;accepted:boolean;reason:string|null; }
// T34
export declare function validateFlowEvent(event: unknown): asserts event is FlowEvent;
// T36
export declare function flowEvent(flow: Flow, type: FlowEvent['type'], payload: unknown, id?: string): FlowEvent;
// T36
export declare function flowFixture(): Flow;
// T36
export declare function reduceFlow(flow: Flow, event: FlowEvent): Transition;
```

Produces:

```ts
export declare function ledgerDirectory(repository: string, override?: string, env?: Record<string,string|undefined>, platform?: string, home?: string): Promise<string>;
export declare function readFlow(directory: string, id: string): Promise<Flow>;
export declare function createLedger(directory: string, flow: Flow): Promise<void>;
export declare function appendEvent(directory: string, id: string, event: FlowEvent): Promise<Transition>;
export declare function listFlows(directory: string, repositoryId: string): Promise<Flow[]>;
export declare function flowDirectory(id: string, override?: string, env?: Record<string,string|undefined>, platform?: string, home?: string): Promise<string>;
```

## Steps

- [ ] 1. Write the failing test at `tests/flow/ledger.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { mkdtemp,writeFile,readFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprintSet } from "../../src/flow/model";
import { createLedger,appendEvent,readFlow } from "../../src/flow/ledger";
import { flowFixture,flowEvent } from "../helpers/flow";
test("restart preserves counters, bytes append, and locks reject races",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-ledger-"));
 try{
  const f=flowFixture();
  await createLedger(dir,f);
  let current=(await appendEvent(dir,f.flow_id,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,
   base_fingerprint:fingerprintSet(f.current),actions:["a"],paths:["task.md"],mode:"plan",candidate_fingerprint:null,
   max_fixes:{a:1},role_approvals:[],expires_at:"2027-01-01",by:"ray",source:"user"}))).flow;
  current=(await appendEvent(dir,f.flow_id,flowEvent(current,"evaluation",{action:"a",candidate_fingerprint:fingerprintSet(current.current),
   method:{kind:"manual",id:"review",version:"1"},result:"fail",report:null,execution:null,evidence:[],
   by:"ray",source:"user",unknown_effects:[]}))).flow;
  current=(await appendEvent(dir,f.flow_id,flowEvent(current,"continue-fix",{}))).flow;
  expect((await readFlow(dir,f.flow_id)).fixes.a).toBe(1);
  const before=await readFile(join(dir,"fixture.jsonl"),"utf8");
  const t=await appendEvent(dir,f.flow_id,flowEvent(current,"stop",{}));
  expect(t.accepted).toBe(true);
  expect((await readFile(join(dir,"fixture.jsonl"),"utf8")).startsWith(before)).toBe(true);
  expect((await readFlow(dir,f.flow_id)).seq).toBe(4);
  expect(before).not.toContain('"state":');expect(before).not.toContain('"previous_hash":');
  await writeFile(join(dir,"fixture.lock"),"other writer");
  await expect(appendEvent(dir,f.flow_id,flowEvent(t.flow,"resume",{}))).rejects.toMatchObject({code:1,message:"ledger_locked"});
 }finally{await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/flow/ledger'`.

```sh
bun test tests/flow/ledger.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/flow/ledger.ts** (complete file)

```ts
import { mkdir,open,readFile,readdir,unlink } from "node:fs/promises";
import { join,resolve } from "node:path";
import { homedir } from "node:os";
import type { Flow,FlowEvent,LedgerRow,Transition } from "./types";
import { MaatError } from "../errors";
import { canonical,repoId } from "../canonical";
import { outsidePath,writeOutside } from "../cli/output";
import { reduceFlow } from "./reducer";
import { openFlow } from "./model";
import { validateFlowEvent } from "./validate";
function path(dir:string,id:string):string {
 if(!/^[a-zA-Z0-9-]+$/.test(id))throw new MaatError(3,"flow_id");
 return join(dir,id+".jsonl");
}
export async function ledgerDirectory(repository:string,override?:string,env:Record<string,string|undefined>=process.env,platform=process.platform,home=homedir()):Promise<string> {
 const id=repoId(resolve(repository));
 const dir=override??env.MAAT_STATE_DIR??(env.XDG_STATE_HOME?join(env.XDG_STATE_HOME,"maat",id):
 platform==="darwin"?join(home,"Library/Application Support/maat",id):join(home,".local/state/maat",id));
 return outsidePath(dir,repository);
}
export async function flowDirectory(id:string,override?:string,env:Record<string,string|undefined>=process.env,platform=process.platform,home=homedir()):Promise<string> {
 const chosen=override??env.MAAT_STATE_DIR;if(chosen)return resolve(chosen);
 const match=/^([a-f0-9]{16})-[a-zA-Z0-9-]+$/.exec(id);
 if(!match)throw new MaatError(3,"flow_id_requires_repository_prefix");
 const base=env.XDG_STATE_HOME?join(env.XDG_STATE_HOME,"maat"):
 platform==="darwin"?join(home,"Library/Application Support/maat"):join(home,".local/state/maat");
 return join(base,match[1]!);
}
function decode(text:string):{rows:LedgerRow[];flow:Flow} {
 if(!text.endsWith("\n"))throw new MaatError(3,"ledger_truncated");
 let rows:LedgerRow[];
 try{rows=text.trimEnd().split("\n").map(line=>JSON.parse(line));}catch{throw new MaatError(3,"ledger_parse");}
 const first=rows[0];
 if(!first||first.event?.type!=="open"||first.seq!==0||first.before!==null)throw new MaatError(3,"ledger_integrity");
 let flow=openFlow(first.event.id,first.event.plan,{repository:first.event.plan.repository,materials:first.event.fingerprints});
 for(let n=0;n<rows.length;n++) {
  const row=rows[n]!;
  if(row.ledger_schema!=="1.0.0"||row.seq!==n||!Number.isFinite(Date.parse(row.at)))throw new MaatError(3,"ledger_integrity");
  if(n===0) {
   if(row.after!=="open"||!row.accepted||row.reason!==null)throw new MaatError(3,"ledger_integrity");
   continue;
  }
  if(row.event.type==="open"||row.before!==flow.status)throw new MaatError(3,"ledger_integrity");
  const transition=reduceFlow(flow,row.event);
  if(row.after!==transition.flow.status||row.accepted!==transition.accepted||row.reason!==transition.reason)
   throw new MaatError(3,"ledger_integrity");
  flow=transition.flow;
 }
 return {rows,flow};
}
async function textFile(dir:string,id:string):Promise<string> {
 try{return await readFile(path(dir,id),"utf8");}catch{throw new MaatError(3,"ledger_read");}
}
export async function readFlow(dir:string,id:string):Promise<Flow> {
 return decode(await textFile(dir,id)).flow;
}
async function locked<T>(dir:string,id:string,root:string,operation:()=>Promise<T>):Promise<T> {
 dir=await outsidePath(dir,root);await mkdir(dir,{recursive:true});
 const lock=join(dir,id+".lock");let handle;
 try{handle=await open(lock,"wx",0o600);}catch(e){
  throw new MaatError(1,(e as NodeJS.ErrnoException).code==="EEXIST"?"ledger_locked":"ledger_lock_io");
 }
 try{return await operation();}finally{await handle.close();await unlink(lock);}
}
export async function createLedger(dir:string,f:Flow):Promise<void> {
 await locked(dir,f.flow_id,f.repository.path,async()=>{
  try{await readFile(path(dir,f.flow_id));throw new MaatError(4,"flow_exists");}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  const first:LedgerRow={ledger_schema:"1.0.0",seq:0,at:new Date().toISOString(),before:null,after:"open",
   event:{type:"open",id:f.flow_id,plan:f.plan,fingerprints:f.base},accepted:true,reason:null};
  await writeOutside(path(dir,f.flow_id),canonical(first)+"\n",f.repository.path);
 });
}
export async function appendEvent(dir:string,id:string,event:FlowEvent):Promise<Transition> {
 validateFlowEvent(event);
 const initial=await readFlow(dir,id);
 return locked(dir,id,initial.repository.path,async()=>{
  const text=await textFile(dir,id),{flow}=decode(text),transition=reduceFlow(flow,event);
  const row:LedgerRow={ledger_schema:"1.0.0",seq:transition.flow.seq,at:event.at,before:flow.status,
   after:transition.flow.status,event,accepted:transition.accepted,reason:transition.reason};
  await writeOutside(path(dir,id),text+canonical(row)+"\n",flow.repository.path);
  return transition;
 });
}
export async function listFlows(dir:string,repositoryId:string):Promise<Flow[]> {
 let names:string[];
 try{names=(await readdir(dir)).filter(n=>n.endsWith(".jsonl")).sort();}
 catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return [];throw new MaatError(3,"ledger_read");}
 const flows=await Promise.all(names.map(n=>readFlow(dir,n.slice(0,-6))));
 return flows.filter(f=>f.repository.repo_id===repositoryId);
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/flow/ledger.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/flow/ledger.ts tests/flow/ledger.test.ts
git commit -m '✨ feat(flow): persist append-only controller history atomically'
```

