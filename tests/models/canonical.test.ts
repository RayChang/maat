import { test, expect } from "bun:test";
import { canonical, sha256, sameScope, repoId } from "../../src/canonical";
test("fingerprints are stable while scopes never pool evidence",()=>{
 expect(canonical({b:2,a:{z:1,x:0}})).toBe('{"a":{"x":0,"z":1},"b":2}');
 expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 expect(repoId("/project")).toHaveLength(16);
 expect(sameScope({workflow:"A",cli:"codex"},{cli:"codex",workflow:"A"})).toBe(true);
 expect(sameScope({workflow:"A"},{workflow:"B"})).toBe(false);
 expect(()=>canonical({x:undefined})).toThrow("non_json_value");
});
