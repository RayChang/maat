import { parseArgs,one,usage } from "./args";
import { runAuditCommand } from "./audit";
import { runInspectCommand } from "./inspect";
import { runFlowCommand } from "./flow";
import { runUpdate } from "./update";
import { emitOutput,writeOutside,outsidePath } from "./output";
import { MaatError } from "../errors";
export async function main(argv:string[],now=new Date().toISOString(),cwd=process.cwd()):Promise<{code:number;stdout:string;stderr:string}> {
 try{
  const a=parseArgs(argv);
  if(a.command==="update")return runUpdate();
  if(a.command==="help")return {code:0,stdout:usage(),stderr:""};
  const result=["scan","evaluate","plan"].includes(a.command)?await runAuditCommand(a,now):
   a.command.startsWith("flow ")?await runFlowCommand(a,now,cwd):await runInspectCommand(a,now,cwd);
  if(a.command==="scan"&&one(a,"snapshot")) {
   const destination=await outsidePath(one(a,"snapshot")!,result.repository);
   await writeOutside(destination,JSON.stringify(result.snapshot,null,2)+"\n",result.repository);
  }
  const stdout=await emitOutput(result.value,result.markdown,{repository:result.repository,kind:result.kind,
   out:one(a,"out"),quiet:!!one(a,"quiet"),format:one(a,"json")?"json":(one(a,"format") as "markdown"|"json"|"both"|undefined)??"markdown"});
  const value=result.value as {diagnostics?:unknown};
  const diagnostics=("diagnostics" in result?result.diagnostics:undefined)??value?.diagnostics;
  const stderr=Array.isArray(diagnostics)?diagnostics.map(String).join("\n"):"";
  return {code:0,stdout,stderr:stderr?stderr+"\n":""};
 }catch(e){return {code:e instanceof MaatError?e.code:1,stdout:"",
  stderr:(e instanceof MaatError?e.message:"internal_error: "+(e instanceof Error?e.message:String(e)))+"\n"};}
}
