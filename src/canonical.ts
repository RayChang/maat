import { createHash } from "node:crypto";
import type { Scope } from "./models";
export function canonical(value:unknown):string {
 function sort(v:unknown):unknown {
  if(v===null || typeof v==="string" || typeof v==="boolean") return v;
  if(typeof v==="number" && Number.isFinite(v)) return v;
  if(Array.isArray(v)) return v.map(sort);
  if(v && typeof v==="object" && Object.getPrototypeOf(v)===Object.prototype)
   return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort((v as Record<string,unknown>)[k])]));
  throw Error("non_json_value");
 }
 return JSON.stringify(sort(value));
}
export function sha256(value:string|Uint8Array):string { return createHash("sha256").update(value).digest("hex"); }
export function lineHashes(text:string):string { return text.split("\n").map(l=>sha256(l.trim()).slice(0,8)).join(""); }
export function sameScope(a:Scope,b:Scope):boolean { return canonical(a)===canonical(b); }
export function repoId(absolutePath:string):string { return sha256(absolutePath).slice(0,16); }
