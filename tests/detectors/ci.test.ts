import { test,expect } from "bun:test";
import { ciObservations } from "../../src/detectors/ci";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("literal configured invocation is distinct from runtime enforcement",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".github/workflows/ci.yml",text:"jobs:\n  test:\n    steps:\n      - run: bun test\n        continue-on-error: true\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const facts=ciObservations(s,p).flatMap(o=>o.facts);
 expect(facts.find(f=>f.claim==="invocation")!.status).toBe("holds");
 expect(facts.find(f=>f.claim==="consequence")!.basis).toBe("advisory");
 s.materials[1]!.text=s.materials[1]!.text.replace("bun test","bun test && echo ok");
 expect(ciObservations(s,p).flatMap(o=>o.facts).find(f=>f.claim==="invocation")!.status).toBe("unknown");
});
test("GitLab and Bitbucket steps are read like GitHub steps",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".gitlab-ci.yml",text:"stages: [verify]\n.template:\n  script: [bun test]\ntest:\n  stage: verify\n  script:\n    - bun test\nlint:\n  script: bun test\n  allow_failure: true\nmanual:\n  script: [bun test]\n  when: manual\n"},
 {path:"bitbucket-pipelines.yml",text:"pipelines:\n  default:\n    - step:\n        script:\n          - bun test\n    - parallel:\n        - step:\n            on-fail:\n              strategy: ignore\n            script:\n              - bun test\n  branches:\n    main:\n      - stage:\n          steps:\n            - step:\n                script:\n                  - bun test && echo ok\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const obs=ciObservations(s,p);
 expect(obs.filter(o=>o.detector==="ci-config-found@1").map(o=>o.evidence[0]!.path)).toEqual([".gitlab-ci.yml","bitbucket-pipelines.yml"]);
 expect(obs.flatMap(o=>o.facts).filter(f=>f.claim!=="configuration").map(f=>[f.claim,f.scope.workflow,f.scope.boundary,f.claim==="invocation"?f.status:f.basis])).toEqual([
  ["invocation",".gitlab-ci.yml","test/0","holds"],["consequence",".gitlab-ci.yml","test/0","blocking"],
  ["invocation",".gitlab-ci.yml","lint/0","holds"],["consequence",".gitlab-ci.yml","lint/0","advisory"],
  ["invocation",".gitlab-ci.yml","manual/0","holds"],["consequence",".gitlab-ci.yml","manual/0","advisory"],
  ["invocation","bitbucket-pipelines.yml","default/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/0/0","blocking"],
  ["invocation","bitbucket-pipelines.yml","default/1/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/1/0/0","advisory"],
  ["invocation","bitbucket-pipelines.yml","branches/main/0/0/0","unknown"],["consequence","bitbucket-pipelines.yml","branches/main/0/0/0","blocking"]]);
 s.materials[1]!.text="include: [{local: .gitlab/ci/base.yml}]\n"+s.materials[1]!.text;
 expect(ciObservations(s,p).flatMap(o=>o.facts).filter(f=>f.claim==="consequence"&&f.scope.workflow===".gitlab-ci.yml").map(f=>f.basis)).toEqual(["unknown","unknown","unknown"]);
});
test("unrecognized GitLab and Bitbucket shapes stay unknown",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".gitlab-ci.yml",text:"ref:\n  script: [!reference [.setup, script], bun test]\nruled:\n  script: [bun test]\n  rules: [{when: always}]\nextended:\n  extends: .base\n  script: [bun test]\ncodes:\n  script: [bun test]\n  allow_failure: {exit_codes: 1}\n"},
 {path:"bitbucket-pipelines.yml",text:"pipelines:\n  default:\n    - step:\n        on-fail:\n          strategy: retry\n        script:\n          - bun test\n    - stage:\n        on-fail:\n          strategy: ignore\n        steps:\n          - step:\n              script:\n                - bun test\n    - parallel:\n        on-fail:\n          strategy: ignore\n        steps:\n          - step:\n              script:\n                - bun test\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(ciObservations(s,p).flatMap(o=>o.facts).filter(f=>f.claim!=="configuration").map(f=>[f.claim,f.scope.workflow,f.scope.boundary,f.claim==="invocation"?f.status:f.basis])).toEqual([["invocation",".gitlab-ci.yml","ref/0","unknown"],["consequence",".gitlab-ci.yml","ref/0","blocking"],
  ["invocation",".gitlab-ci.yml","ref/1","holds"],["consequence",".gitlab-ci.yml","ref/1","blocking"],
  ["invocation",".gitlab-ci.yml","ruled/0","holds"],["consequence",".gitlab-ci.yml","ruled/0","unknown"],
  ["invocation",".gitlab-ci.yml","extended/0","holds"],["consequence",".gitlab-ci.yml","extended/0","unknown"],
  ["invocation",".gitlab-ci.yml","codes/0","holds"],["consequence",".gitlab-ci.yml","codes/0","unknown"],
  ["invocation","bitbucket-pipelines.yml","default/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/0/0","unknown"],
  ["invocation","bitbucket-pipelines.yml","default/1/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/1/0/0","advisory"],
  ["invocation","bitbucket-pipelines.yml","default/2/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/2/0/0","advisory"]]);
});
