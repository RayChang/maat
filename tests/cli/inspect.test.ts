import { test, expect } from "bun:test";
import { runInspectCommand } from "../../src/cli/inspect";
import { parseArgs } from "../../src/cli/args";
test("focused explain and skeleton preserve manual requirements",async()=>{
 const time="2026-11-04T00:00:00Z";
 const e=await runInspectCommand(parseArgs(["explain","prompt.task-spec"]),time);
 expect((e.value as {id:string}).id).toBe("prompt.task-spec");
 const a=await runInspectCommand(parseArgs(["attest","template","--check","prompt.task-spec"]),time);
 expect((a.value as {claims:string[]}).claims).toEqual(["goal","scope","constraints","acceptance"]);
 const list=await runInspectCommand(parseArgs(["catalog","list","--layer","prompt","--tier","baseline"]),time);
 expect((list.value as unknown[]).length).toBe(2);
 await expect(runInspectCommand(parseArgs(["explain","unknown"]),time)).rejects.toThrow("unknown_id");
});
