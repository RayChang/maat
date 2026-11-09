import { test, expect } from "bun:test";
import { checkShape } from "../src/schema";
test("schema errors name the path and what was expected",()=>{
 const shape={type:"object" as const,required:["result"],properties:{result:{enum:["pass","fail"]},by:{type:"string" as const,minLength:1}},additionalProperties:false};
 expect(()=>checkShape({},shape)).toThrow("schema_error: $ missing result");
 expect(()=>checkShape({result:"verified"},shape)).toThrow('schema_error: $.result expected one of ["pass","fail"]');
 expect(()=>checkShape({result:"pass",by:1},shape)).toThrow("schema_error: $.by expected string");
 expect(()=>checkShape({result:"pass",extra:1},shape)).toThrow("schema_error: $ unexpected key extra");
});
