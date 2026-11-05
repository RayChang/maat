import { MaatError } from "./errors";
export interface Shape {
 type?:"object"|"array"|"string"|"number"|"boolean"; required?:string[];
 properties?:Record<string,Shape>; additionalProperties?:boolean|Shape; items?:Shape;
 enum?:unknown[];minItems?:number;minLength?:number;pattern?:string;
}
export function checkShape(v:unknown,s:Shape,path="$"):void {
 const fail=():never=>{throw new MaatError(3,"schema_error: "+path);};
 if(s.enum && !s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))) fail();
 if(s.type==="array") {
  if(!Array.isArray(v) || v.length<(s.minItems??0)) fail();
  (v as unknown[]).forEach((x,i)=>checkShape(x,s.items??{},path+"["+i+"]"));return;
 }
 if(s.type==="object") {
  if(!v || typeof v!=="object" || Array.isArray(v)) fail();
  const o=v as Record<string,unknown>;
  for(const k of s.required??[]) if(!(k in o)) fail();
  for(const [k,x] of Object.entries(o)) {
   if(["__proto__","constructor","prototype"].includes(k)) fail();
   const child=s.properties?.[k];
   if(child) checkShape(x,child,path+"."+k);
   else if(s.additionalProperties===false) fail();
   else if(typeof s.additionalProperties==="object") checkShape(x,s.additionalProperties,path+"."+k);
  }
  return;
 }
 if(s.type && typeof v!==s.type) fail();
 if(typeof v==="number" && !Number.isFinite(v)) fail();
 if(typeof v==="string" && (v.length<(s.minLength??0) || (s.pattern && !new RegExp(s.pattern).test(v)))) fail();
}
