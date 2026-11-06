import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discover } from "../../src/discovery/inventory";
test("reads configuration, skips secrets, never follows symlinks",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-discovery-"));
 try{
  await mkdir(join(root,".claude")); await mkdir(join(root,".ssh"));
  await writeFile(join(root,"README.md"),"Hello\n");
  await writeFile(join(root,".claude/settings.json"),'{"hooks":{}}');
  await writeFile(join(root,".ssh/id_rsa"),"DO NOT READ");
  await symlink("/etc/passwd",join(root,"escape.md"));
  const r=await discover(root,{include:["."],exclude:[]});
  expect(r.materials.map(m=>m.path)).toEqual([".claude/settings.json","README.md"]);
  expect(r.diagnostics).toContain("symlink_unread: escape.md");
  expect(r.complete).toBe(false);
  expect(r.materials.some(m=>m.text.includes("DO NOT READ"))).toBe(false);
 }finally{await rm(root,{recursive:true,force:true});}
});
test("reads GitLab and Bitbucket CI files but no other dot files",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-discovery-ci-"));
 try{
  await mkdir(join(root,".gitlab/ci"),{recursive:true});
  await writeFile(join(root,".gitlab-ci.yml"),"test:\n  script: [bun test]\n");
  await writeFile(join(root,".gitlab/ci/verify.yml"),"verify:\n  script: [bun test]\n");
  await writeFile(join(root,"bitbucket-pipelines.yml"),"pipelines: {}\n");
  await writeFile(join(root,".other.yml"),"skip: true\n");
  const r=await discover(root,{include:["."],exclude:[]});
  expect(r.materials.map(m=>m.path)).toEqual([".gitlab/ci/verify.yml",".gitlab-ci.yml","bitbucket-pipelines.yml"]);
 }finally{await rm(root,{recursive:true,force:true});}
});
