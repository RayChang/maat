import { test, expect } from "bun:test";
import { fingerprintSet } from "../../src/flow/model";
test("checkpoint order is irrelevant but duplicate paths are rejected",()=>{
 const a={path:"a",sha256:"a".repeat(64)},b={path:"b",sha256:"b".repeat(64)};
 expect(fingerprintSet([a,b])).toBe(fingerprintSet([b,a]));
 expect(()=>fingerprintSet([a,a])).toThrow("checkpoint_duplicate");
 expect(()=>fingerprintSet([{path:"a",sha256:"bad"}])).toThrow("checkpoint_shape");
});
import { validateFlowEvent } from "../../src/flow/validate";
test("malformed checkpoint is a data error before a reducer sees it",()=>{
 expect(()=>validateFlowEvent({id:"x",expected_seq:0,at:"2026-11-04",expires_at:"2027-01-01",
 type:"before",by:"ray",payload:{action:"a",fingerprints:[{path:"task.md",sha256:"invalid"}]}})).toThrow("checkpoint_shape");
});
test("unparseable approval and authorization dates are data errors",()=>{
 for(const type of ["approve","authorize"] as const)
  expect(()=>validateFlowEvent({id:"date",expected_seq:0,at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",type,by:"ray",payload:{expires_at:"not-a-date"}})).toThrow("approval_time");
});
