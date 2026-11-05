# T38 — Connect all flow commands and the final CLI error boundary

DECISION (implementer default): approve/authorize/checkpoint/record input files use {id, expected_seq, expires_at, by?, payload}. The CLI supplies the event type and current timestamp; --by overrides the envelope actor for approve/authorize. checkpoint requires by in its envelope; record may use payload.by or payload.executed_by. decide creates an immediate event with a 60-second envelope lifetime (not a workflow budget); resume requires --by. status includes remaining fixes, pending checkpoints, and unknown effects. --ledger wins over all environment defaults. v1 has no executor hidden behind flow record. All command handlers return data to one output boundary. DECISION (implementer default): flow list finds the nearest ancestor containing .git or .maat/policy.yaml, falling back to cwd; flow IDs locate status/mutations even from another repository or directory. It skips ledgers that fail to read with an input error, reports each as a ledger_skipped diagnostic on stderr, and still exits 0. The code blocks below are the original v1 implementation; a later follow-up changed listFlows to return {flows, diagnostics} and flow list to report skipped ledgers on stderr.

## Files

- Create: `src/cli/flow.ts`, `src/cli/main.ts`.
- Modify: `src/cli/index.ts`.
- Test path: `tests/cli/main.test.ts`.

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
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
// T02
export declare function one(args: Args, flag: string): string | undefined;
// T02
export declare function parseArgs(argv: string[]): Args;
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
// T09
export declare function parseSnapshot(text: string): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T29
export declare function emitOutput(value: unknown, markdown: string, options: {repository:string;kind:string;out?:string;quiet?:boolean;format?:'markdown'|'json'|'both'}): Promise<string>;
// T29
export declare function outsidePath(destination: string, repository: string): Promise<string>;
// T29
export declare function writeOutside(destination: string, text: string, repository: string): Promise<void>;
// T31
export declare function parsePlan(text: string): Plan;
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
// T32
export interface CommandResult { value:unknown;markdown:string;repository:string;kind:string;snapshot?:Snapshot; }
// T32
export declare function runAuditCommand(args: Args, now: string): Promise<CommandResult>;
// T33
export declare function runInspectCommand(args: Args, now: string, cwd?: string): Promise<CommandResult>;
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
export declare function openFlow(id: string, plan: Plan, snapshot: Pick<Snapshot, 'repository' | 'materials'>): Flow;
// T34
export interface Transition { flow:Flow;accepted:boolean;reason:string|null; }
// T36
export declare function flowFixture(): Flow;
// T37
export declare function appendEvent(directory: string, id: string, event: FlowEvent): Promise<Transition>;
// T37
export declare function createLedger(directory: string, flow: Flow): Promise<void>;
// T37
export declare function flowDirectory(id: string, override?: string, env?: Record<string,string|undefined>, platform?: string, home?: string): Promise<string>;
// T37
export declare function ledgerDirectory(repository: string, override?: string, env?: Record<string,string|undefined>, platform?: string, home?: string): Promise<string>;
// T37
export declare function listFlows(directory: string, repositoryId: string): Promise<Flow[]>;
// T37
export declare function readFlow(directory: string, id: string): Promise<Flow>;
```

Produces:

```ts
export declare function runFlowCommand(args: Args, now: string, cwd?: string): Promise<CommandResult>;
export declare function main(argv: string[], now?: string, cwd?: string): Promise<{code:number;stdout:string;stderr:string}>;
```

## Steps

- [ ] 1. Write the failing test at `tests/cli/main.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { main } from "../../src/cli/main";
test("CLI distinguishes normal gaps, usage errors, and malformed inputs",async()=>{
 const v=await main(["version","--json"]);expect(v.code).toBe(0);
 expect(JSON.parse(v.stdout).tool_version).toBe("0.1.0");
 expect((await main(["scan","--fail-on","missing"])).code).toBe(2);
 expect((await main(["evaluate","--snapshot","/maat-no-such-input"])).code).toBe(3);
 expect((await main(["version","--quiet"])).stdout).toBe("");
 const scan=await main(["scan","tests/cli","--json"]);
 expect(scan.code).toBe(0);
 expect(JSON.parse(scan.stdout).items.some((i:{result:string})=>i.result==="unknown")).toBe(true);
});
import { mkdtemp,writeFile,readFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flowFixture } from "../helpers/flow";
import { createLedger,flowDirectory } from "../../src/flow/ledger";
test("flow dispatch distinguishes a guard rejection from malformed event data",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-dispatch-"));
 try {
  const f=flowFixture();await createLedger(dir,f);
  const argv=["--flow",f.flow_id,"--ledger",dir,"--json"];
  const status=await main(["flow","status",...argv],"2026-11-04","/tmp");
  expect(status.code).toBe(0);expect(JSON.parse(status.stdout).flow_id).toBe(f.flow_id);
  expect((await main(["flow","decide",...argv,"--event","accept"],"2026-11-04","/tmp")).code).toBe(4);
  const before=await readFile(join(dir,f.flow_id+".jsonl"),"utf8");
  const file=join(dir,"malformed.json");
  await writeFile(file,JSON.stringify({id:"bad",expected_seq:1,expires_at:"2027-01-01",by:"ray",
   payload:{action:"a",fingerprints:[{path:"task.md",sha256:"invalid"}]}}));
  expect((await main(["flow","checkpoint",...argv,"--action","a","--phase","before","--fingerprints",file],
   "2026-11-04","/tmp")).code).toBe(3);
  expect(await readFile(join(dir,f.flow_id+".jsonl"),"utf8")).toBe(before);
  expect(await flowDirectory("0123456789abcdef-session",undefined,{XDG_STATE_HOME:"/state"},"linux","/home/u"))
   .toBe("/state/maat/0123456789abcdef");
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("flow ID finds its ledger from another cwd without a ledger override",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-state-")),oldXdg=process.env.XDG_STATE_HOME,oldMaat=process.env.MAAT_STATE_DIR;
 try {
  process.env.XDG_STATE_HOME=dir;delete process.env.MAAT_STATE_DIR;
  const f=flowFixture();f.flow_id=f.repository.repo_id+"-outside-cwd";
  const location=await flowDirectory(f.flow_id);await createLedger(location,f);
  const result=await main(["flow","status","--flow",f.flow_id,"--json"],"2026-11-04","/tmp");
  expect(result.code).toBe(0);expect(JSON.parse(result.stdout).flow_id).toBe(f.flow_id);
 }finally{
  if(oldXdg===undefined)delete process.env.XDG_STATE_HOME;else process.env.XDG_STATE_HOME=oldXdg;
  if(oldMaat===undefined)delete process.env.MAAT_STATE_DIR;else process.env.MAAT_STATE_DIR=oldMaat;
  await rm(dir,{recursive:true,force:true});
 }
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/cli/main'`.

```sh
bun test tests/cli/main.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/cli/flow.ts** (complete file)

```ts
import { readFile,realpath,lstat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve,join,dirname } from "node:path";
import type { Args } from "./args";
import { one } from "./args";
import type { CommandResult } from "./audit";
import type { FlowEvent,Flow } from "../flow/types";
import { MaatError } from "../errors";
import { parsePlan } from "../plan";
import { parseSnapshot } from "../snapshot";
import { openFlow } from "../flow/model";
import { ledgerDirectory,createLedger,readFlow,appendEvent,listFlows,flowDirectory } from "../flow/ledger";
import { canonical,sha256,repoId } from "../canonical";
async function repositoryRoot(cwd:string):Promise<string> {
 let path=await realpath(resolve(cwd));
 for(;;) {
  for(const name of [".git",".maat/policy.yaml"]) {
   try{await lstat(join(path,name));return path;}
   catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"repository_read");}
  }
  const parent=dirname(path);if(parent===path)return realpath(resolve(cwd));path=parent;
 }
}
async function input(path:string):Promise<string>{try{return await readFile(path,"utf8");}catch{throw new MaatError(3,"input_read");}}
function status(f:Flow):unknown {
 return {...f,remaining_fixes:Object.fromEntries(f.plan.actions.map(a=>[a.id,
 Math.max(0,(f.approval?.max_fixes[a.id]??0)-(f.fixes[a.id]??0))]))};
}
export async function runFlowCommand(a:Args,now:string,cwd=process.cwd()):Promise<CommandResult> {
 let repository=await realpath(resolve(cwd)),value:unknown;
 if(a.command==="flow open") {
  const plan=parsePlan(await input(one(a,"plan")!)),snapshot=parseSnapshot(await input(one(a,"snapshot")!));
  repository=plan.repository.path;
  const flow=openFlow(plan.repository.repo_id+"-"+randomUUID(),plan,snapshot),dir=await ledgerDirectory(repository,one(a,"ledger"));
  await createLedger(dir,flow);value={flow_id:flow.flow_id,state:status(flow)};
 } else {
  if(a.command==="flow list")repository=await repositoryRoot(cwd);
  const dir=a.command==="flow list"?await ledgerDirectory(repository,one(a,"ledger")):await flowDirectory(one(a,"flow")!,one(a,"ledger"));
  if(a.command==="flow list")value=(await listFlows(dir,repoId(repository))).map(f=>({flow_id:f.flow_id,status:f.status}));
  else {
   const id=one(a,"flow")!,flow=await readFlow(dir,id);repository=flow.repository.path;
   if(a.command==="flow status")value=status(flow);
   else {
    let event:FlowEvent;
    if(a.command==="flow decide") {
     const type=one(a,"event") as FlowEvent["type"];
     if(type==="resume"&&!one(a,"by"))throw new MaatError(2,"usage_error: resume requires --by");
     const by=one(a,"by")??"host-provided:unknown";
     event={id:sha256(canonical({flow:id,seq:flow.seq,type,by})),expected_seq:flow.seq,at:now,
      expires_at:new Date(Date.parse(now)+60000).toISOString(),type,by,payload:{}};
    } else {
     const file=one(a,"scope")??one(a,"command")??one(a,"fingerprints")??one(a,"file");
     let envelope:Record<string,unknown>;try{envelope=JSON.parse(await input(file!));}catch{throw new MaatError(3,"event_parse");}
     if(!envelope || typeof envelope.id!=="string" || !Number.isInteger(envelope.expected_seq) ||
       typeof envelope.expires_at!=="string" || !envelope.payload || typeof envelope.payload!=="object")throw new MaatError(3,"event_shape");
     const payload=envelope.payload as Record<string,unknown>;
     const type=(a.command==="flow checkpoint"?one(a,"phase"):a.command==="flow record"?one(a,"kind"):a.command.slice(5)) as FlowEvent["type"];
     if(a.command==="flow checkpoint") {
      if(payload.action!==undefined&&payload.action!==one(a,"action"))throw new MaatError(3,"action_mismatch");
      payload.action=one(a,"action");
     }
     const by=one(a,"by")??envelope.by??payload.by??payload.executed_by;
     if(typeof by!=="string"||!by.trim())throw new MaatError(3,"event_actor");
     if(type==="approve"||type==="authorize")payload.by=by;
     event={id:envelope.id,expected_seq:envelope.expected_seq as number,at:now,
      expires_at:envelope.expires_at,type,by,payload};
    }
    const t=await appendEvent(dir,id,event);
    if(!t.accepted)throw new MaatError(4,"flow_rejected: "+t.reason);
    value=status(t.flow);
   }
  }
 }
 return {value,markdown:"# maat "+a.command+"\n\n\u0060\u0060\u0060json\n"+JSON.stringify(value,null,2)+"\n\u0060\u0060\u0060\n",
 repository,kind:a.command.replaceAll(" ","-")};
}
```

**src/cli/main.ts** (complete file)

```ts
import { parseArgs,one } from "./args";
import { runAuditCommand } from "./audit";
import { runInspectCommand } from "./inspect";
import { runFlowCommand } from "./flow";
import { emitOutput,writeOutside,outsidePath } from "./output";
import { MaatError } from "../errors";
export async function main(argv:string[],now=new Date().toISOString(),cwd=process.cwd()):Promise<{code:number;stdout:string;stderr:string}> {
 try{
  const a=parseArgs(argv);
  const result=["scan","evaluate","plan"].includes(a.command)?await runAuditCommand(a,now):
   a.command.startsWith("flow ")?await runFlowCommand(a,now,cwd):await runInspectCommand(a,now,cwd);
  if(a.command==="scan"&&one(a,"snapshot")) {
   const destination=await outsidePath(one(a,"snapshot")!,result.repository);
   await writeOutside(destination,JSON.stringify(result.snapshot,null,2)+"\n",result.repository);
  }
  const stdout=await emitOutput(result.value,result.markdown,{repository:result.repository,kind:result.kind,
   out:one(a,"out"),quiet:!!one(a,"quiet"),format:one(a,"json")?"json":(one(a,"format") as "markdown"|"json"|"both"|undefined)??"markdown"});
  const value=result.value as {diagnostics?:unknown};
  const stderr=Array.isArray(value?.diagnostics)?value.diagnostics.map(String).join("\n"):"";
  return {code:0,stdout,stderr:stderr?stderr+"\n":""};
 }catch(e){return {code:e instanceof MaatError?e.code:1,stdout:"",
  stderr:(e instanceof MaatError?e.message:"internal_error: "+(e instanceof Error?e.message:String(e)))+"\n"};}
}
```

**src/cli/index.ts** (replace complete file)

```ts
#!/usr/bin/env bun
import { main } from "./main";
if(import.meta.main) {
 const result=await main(process.argv.slice(2));
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 process.exitCode=result.code;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/cli/main.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/cli/flow.ts src/cli/main.ts src/cli/index.ts tests/cli/main.test.ts
git commit -m '✨ feat(cli): connect controller commands and stable exit codes'
```

