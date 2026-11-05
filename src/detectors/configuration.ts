import type { ScanData,Observation } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
export function configurationObservations(s:ScanData):Observation[] {
 const out:Observation[]=[];
 for(const m of s.materials) {
  if(/(^|\/)package\.json$/.test(m.path)) {
   const {data,diagnostics}=parseConfig(m,"json");
   out.push(observe("environment.declarations@1",[m],{},[
    signal("foundation.dev-environment","versions",JSON.stringify(data.engines??{})),
    signal("foundation.dev-environment","dependencies",JSON.stringify(Object.keys((data.dependencies??{}) as object)))],
    ["No dependency install or reproducibility claim"],diagnostics));
  }
  if(/(^|\/)tsconfig\.json$/.test(m.path)) {
   const {data,diagnostics}=parseConfig(m,"json");
   out.push(observe("analysis.config@1",[m],{},[
    signal("foundation.static-analysis","configuration",JSON.stringify({
     compilerOptions:data.compilerOptions??{},include:data.include??[],exclude:data.exclude??[]}))],
    ["Unresolved extends and tool defaults require confirmation; not executed"],diagnostics));
  }
  if(/(^|\/)(eslint|prettier)\.config\.[cm]?[jt]s$/.test(m.path))
   out.push(observe("analysis.config@1",[m],{},[],[],["dynamic_config: "+m.path]));
  if(m.path===".github/dependabot.yml"||m.path===".github/dependabot.yaml") {
   const {data,diagnostics}=parseConfig(m,"yaml");
   out.push(observe("security.config-signals@1",[m],{},[
    signal("foundation.security-signals","updates",JSON.stringify(data.updates??[]))],
    ["No vulnerability scan; no platform enforcement or ownership claim"],diagnostics));
  }
 }
 out.push(observe("tests.structure@1",s.materials.filter(m=>/\.(test|spec)\.[cm]?[jt]sx?$/.test(m.path)),{},[],
 ["Test content requires scoped human confirmation in this parser version"],["detector_unsupported: tests.structure@1"]));
 return out;
}
