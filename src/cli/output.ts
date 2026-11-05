import { realpath, mkdir, open, rename, unlink } from "node:fs/promises";
import { resolve,dirname,basename,join,relative,isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { MaatError } from "../errors";
import { canonical } from "../canonical";
async function canonicalFuture(path:string):Promise<string> {
 const tail:string[]=[];let current=resolve(path);
 while(true) {
  try{return join(await realpath(current),...tail.reverse());}
  catch(e) {
   if((e as NodeJS.ErrnoException).code!=="ENOENT") throw new MaatError(3,"output_path");
   const parent=dirname(current);if(parent===current)throw new MaatError(3,"output_path");
   tail.push(basename(current));current=parent;
  }
 }
}
export async function outsidePath(destination:string,repository:string):Promise<string> {
 const root=await canonicalFuture(repository),dest=await canonicalFuture(destination),rel=relative(root,dest);
 if(rel===""||(!rel.startsWith(".."+"/")&&rel!==".."&&!isAbsolute(rel))) throw new MaatError(3,"output_inside_repository");
 return dest;
}
export async function writeOutside(destination:string,text:string,repository:string):Promise<void> {
 const target=await outsidePath(destination,repository);
 await mkdir(dirname(target),{recursive:true});
 await outsidePath(dirname(target),repository);
 const temp=join(dirname(target),"."+basename(target)+"."+randomUUID()+".tmp");
 let file;
 try {
  file=await open(temp,"wx",0o600);await file.writeFile(text,"utf8");await file.sync();await file.close();file=undefined;
  await rename(temp,target);
 } catch(e) {throw e instanceof MaatError?e:new MaatError(3,"output_write");}
 finally {if(file)await file.close();await unlink(temp).catch(()=>{});}
}
export async function emitOutput(value:unknown,markdown:string,o:{repository:string;kind:string;out?:string;quiet?:boolean;format?:"markdown"|"json"|"both"}):Promise<string> {
 const json=canonical(value)+"\n";
 if(o.out) {
  const a=await outsidePath(join(o.out,o.kind+".json"),o.repository);
  const b=await outsidePath(join(o.out,o.kind+".md"),o.repository);
  await writeOutside(a,json,o.repository);await writeOutside(b,markdown,o.repository);
 }
 if(o.quiet)return "";
 return o.format==="json"?json:o.format==="both"?markdown+"\n\u0060\u0060\u0060json\n"+json+"\u0060\u0060\u0060\n":markdown;
}
