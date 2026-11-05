#!/usr/bin/env bun
import { versions } from "../versions";
import { MaatError } from "../errors";
import { parseArgs,one } from "./args";
import { loadCatalog } from "../catalog/load";
import { validateCatalog } from "../catalog/validate";
try {
  const args=parseArgs(process.argv.slice(2));
  let result:unknown;
  if(args.command==="version") result=versions;
  else if(args.command==="catalog validate") {
    const catalog=await loadCatalog(one(args,"catalog")); validateCatalog(catalog);
    result={valid:true,catalog_version:catalog.catalog_version};
  } else throw new MaatError(2,"usage_error: command is not connected");
  if(!one(args,"quiet")) console.log(JSON.stringify(result,null,one(args,"json")?0:2));
} catch(error) {
  console.error(error instanceof Error?error.message:"internal_error");
  process.exitCode=error instanceof MaatError?error.code:1;
}
