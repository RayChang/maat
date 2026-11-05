import { mkdir,writeFile } from "node:fs/promises";
import { dirname,join } from "node:path";
import { fixtureFiles,materializeFlowFixtures } from "../tests/helpers/fixtures";
import { extractCatalog } from "./extract-catalog";
for(const [name,files] of Object.entries(fixtureFiles))for(const [path,text] of Object.entries(files)) {
 const target=join("tests/fixtures",name,path);await mkdir(dirname(target),{recursive:true});await writeFile(target,text);
}
const catalog="tests/fixtures/unapproved-catalog/catalog";
await extractCatalog(await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text(),catalog);
const meta=await Bun.file(catalog+"/metadata.json").json();meta.approved=false;
await writeFile(catalog+"/metadata.json",JSON.stringify(meta,null,2)+"\n");
await materializeFlowFixtures();
