import { MaatError } from "./errors";
export interface Shape {
 type?:"object"|"array"|"string"|"number"|"boolean"; required?:string[];
 properties?:Record<string,Shape>; additionalProperties?:boolean|Shape; items?:Shape;
 enum?:unknown[];minItems?:number;minLength?:number;pattern?:string;
}
export function checkShape(v:unknown,s:Shape,path="$"):void {
 const fail=(why:string):never=>{throw new MaatError(3,"schema_error: "+path+" "+why);};
 if(s.enum && !s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))) fail("expected one of "+JSON.stringify(s.enum));
 if(s.type==="array") {
  if(!Array.isArray(v) || v.length<(s.minItems??0)) fail("expected array"+(s.minItems?" of at least "+s.minItems:""));
  (v as unknown[]).forEach((x,i)=>checkShape(x,s.items??{},path+"["+i+"]"));return;
 }
 if(s.type==="object") {
  if(!v || typeof v!=="object" || Array.isArray(v)) fail("expected object");
  const o=v as Record<string,unknown>;
  for(const k of s.required??[]) if(!(k in o)) fail("missing "+k);
  for(const [k,x] of Object.entries(o)) {
   if(["__proto__","constructor","prototype"].includes(k)) fail("reserved key "+k);
   const child=s.properties?.[k];
   if(child) checkShape(x,child,path+"."+k);
   else if(s.additionalProperties===false) fail("unexpected key "+k);
   else if(typeof s.additionalProperties==="object") checkShape(x,s.additionalProperties,path+"."+k);
  }
  return;
 }
 if(s.type && typeof v!==s.type) fail("expected "+s.type);
 if(typeof v==="number" && !Number.isFinite(v)) fail("expected finite number");
 if(typeof v==="string" && (v.length<(s.minLength??0) || (s.pattern && !new RegExp(s.pattern).test(v)))) fail(s.pattern?"expected string matching "+s.pattern:"expected non-empty string");
}
