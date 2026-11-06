import { realpath, readdir, lstat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256, repoId } from "../canonical";
import type { Material, Policy } from "../models";
import { MaatError } from "../errors";
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
export async function discover(input:string,scope:Policy["scope"]):Promise<Inventory> {
 let root:string;
 try {root=await realpath(resolve(input));if(!(await lstat(root)).isDirectory()) throw Error();}
 catch {throw new MaatError(3,"repository_path");}
 const r:Inventory={root,repo_id:repoId(root),materials:[],complete:true,diagnostics:[],
 limits:["10000 files","1 MiB/file","32 MiB total","UTF-8 only","symlinks not followed"],
 include:scope.include,exclude:[...scope.exclude,"node_modules/**","vendor/**","dist/**","build/**","credential paths","unlisted hidden directories"]};
 let total=0,count=0;
 const hidden=new Set([".claude",".codex",".github",".agents",".maat",".git",".gitlab"]);
 const denied=new Set(["node_modules","vendor","dist","build"]);
 const credential=/(^\.env($|\.)|credentials?|secrets?|^id_(rsa|ed25519)$|\.pem$|\.key$|^\.npmrc$|^\.netrc$)/i;
 const pattern=(p:string,g:string)=>g==="." || new Bun.Glob(g).match(p) || p.startsWith(g.replace(/\/$/,"")+"/");
 function diagnostic(s:string){r.complete=false;r.diagnostics.push(s);}
 async function walk(rel:string):Promise<void> {
  let names:string[];
  try{names=(await readdir(join(root,rel))).sort();}catch{diagnostic("read_error: "+rel);return;}
  for(const name of names) {
   const p=rel?rel+"/"+name:name;
   if(denied.has(name)||credential.test(name)) continue;
   if(scope.exclude.some(g=>pattern(p,g))) continue;
   let st;
   try{st=await lstat(join(root,p));}catch{diagnostic("read_error: "+p);continue;}
   if(st.isSymbolicLink()){diagnostic("symlink_unread: "+p);continue;}
   if(st.isDirectory()){
    if(name.startsWith(".") && !hidden.has(name)) continue;
    if(p.startsWith(".git/")) continue;
    await walk(p);continue;
   }
   if(!st.isFile() || (p.startsWith(".git/") && p!==".git/HEAD")) continue;
   if(name.startsWith(".") && ![".gitignore",".tool-versions"].includes(name) && p!==".gitlab-ci.yml" && !hidden.has(rel.split("/")[0]!)) continue;
   if(!scope.include.some(g=>pattern(p,g))) continue;
   if(++count>10000 || st.size>1048576 || total+st.size>33554432){diagnostic("scan_limit: "+p);continue;}
   try{
    const bytes=await readFile(join(root,p));
    total+=bytes.length;
    if(bytes.includes(0)){diagnostic("binary_unread: "+p);continue;}
    const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    r.materials.push({path:p,text,sha256:sha256(bytes)});
   }catch{diagnostic("read_error: "+p);}
  }
 }
 await walk("");return r;
}
