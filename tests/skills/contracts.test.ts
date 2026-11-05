import { test, expect } from "bun:test";
test("skills share source and preserve the two authorization boundaries",async()=>{
 for(const name of ["maat-diagnose","maat-improve","verify-before-done"]) {
  const text=await Bun.file("skills/"+name+"/SKILL.md").text();
  const front=/^---\n([\s\S]*?)\n---\n/.exec(text)!;
  expect(front).not.toBeNull();
  const data=Bun.YAML.parse(front[1]!) as Record<string,string>;
  expect(Object.keys(data).sort()).toEqual(["description","name"]);expect(data.name).toBe(name);
 }
 const diagnose=await Bun.file("skills/maat-diagnose/SKILL.md").text();
 const improve=await Bun.file("skills/maat-improve/SKILL.md").text();
 expect(diagnose).toContain("Do not edit the diagnosed project");
 expect(diagnose).toContain("A rewritten candidate on identical evidence is not progress");
 expect(improve).toContain("Modification approval does not authorize tests");
 expect(improve).toContain("Preserve unrelated dirty work");
 expect(improve).toContain("cannot prevent host bypass");
 expect(improve).toContain("reconcile effects and fingerprints");
});
