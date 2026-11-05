import { posix } from "node:path";
import type { ScanData,Observation } from "../models";
import { observe,signal } from "../adapters/common";
import { assertAcyclic } from "../catalog/validate";
export function documentObservations(s:ScanData):Observation[] {
 const out:Observation[]=[],graph:Record<string,string[]>={};
 const docs=s.materials.filter(m=>m.path.endsWith(".md"));
 for(const m of docs) graph[m.path]=[];
 for(const m of docs) {
  const links=[...m.text.matchAll(/\[[^\]\n]*\]\(([^()\s]+)\)/g)],facts=[],diagnostics:string[]=[];
  for(const [,raw] of links) {
   if(/^[a-z][a-z0-9+.-]*:/i.test(raw!) || raw!.startsWith("//")) {diagnostics.push("external_link: "+raw);continue;}
   let link:string;try{link=decodeURIComponent(raw!);}catch{diagnostics.push("link_encoding");continue;}
   const [file,anchor]=link.split("#"),path=posix.normalize(posix.join(posix.dirname(m.path),file||posix.basename(m.path)));
   if(link.startsWith("/")||path===".."||path.startsWith("../")){diagnostics.push("link_escape: "+link);continue;}
   const target=s.materials.find(x=>x.path===path);
   const headings=target?[...target.text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(x=>x[1]!.toLowerCase().replace(/[^a-z0-9 -]/g,"").trim().replace(/ +/g,"-")):[];
   const found=!!target && (!anchor||headings.includes(anchor));
   facts.push(signal("documents","link",(found?"resolved: ":"unresolved: ")+path+(anchor?"#"+anchor:"")));
  }
  out.push(observe("documents.local-links@1",[m],{},facts,["External URLs are not requested","Resolution does not establish content sufficiency"],diagnostics));
  const imports=[...m.text.matchAll(/^@([^\s]+)$/gm)];
  const importDiagnostics:string[]=[];
  for(const [,raw] of imports) {
   const path=posix.normalize(posix.join(posix.dirname(m.path),raw!));
   if(raw!.startsWith("/")||path.startsWith("../")) importDiagnostics.push("import_escape: "+raw);
   else if(path in graph) graph[m.path]!.push(path);
   else importDiagnostics.push("import_unresolved: "+raw);
  }
  const copies=docs.filter(d=>d.path!==m.path&&d.sha256===m.sha256).map(d=>d.path);
  out.push(observe("instructions.import-topology@1",[m],{},[
   signal("documents","imports",JSON.stringify(graph[m.path])),
   signal("documents","identical_copies",JSON.stringify(copies))],["Symlinks not followed"],importDiagnostics));
  out.push(observe("context-size-reported@1",[m],{},[
   signal("documents","bytes",String(Buffer.byteLength(m.text))),
   signal("documents","lines",String(m.text.split("\n").length))],["No size threshold or quality judgment"]));
 }
 try{assertAcyclic(graph);}catch{out.push(observe("instructions.import-topology@1",[],{},[],[],["import_cycle"]));}
 return out;
}
