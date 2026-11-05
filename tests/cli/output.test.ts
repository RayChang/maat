import { test, expect } from "bun:test";
import { mkdtemp,mkdir,symlink,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { outsidePath,emitOutput } from "../../src/cli/output";
test("explicit output cannot enter the target through symlink aliases",async()=>{
 const base=await mkdtemp(join(tmpdir(),"maat-output-")),repo=join(base,"repo");
 try{
  await mkdir(repo);await symlink(repo,join(base,"alias"));
  await expect(outsidePath(join(base,"alias","report.json"),repo)).rejects.toThrow("output_inside_repository");
  expect(await emitOutput({ok:true},"# Report\n",{repository:repo,kind:"report",out:join(base,"out"),quiet:true})).toBe("");
  expect(await Bun.file(join(base,"out/report.json")).json()).toEqual({ok:true});
  expect(await Bun.file(join(base,"out/report.md")).text()).toBe("# Report\n");
 }finally{await rm(base,{recursive:true,force:true});}
});
