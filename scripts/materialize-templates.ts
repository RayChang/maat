import { mkdir,writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { templateDefinitions } from "../src/plan/templates";
for(const t of templateDefinitions) {
 await mkdir(dirname(t.path),{recursive:true});await writeFile(t.path,t.body);
}
await writeFile("catalog/templates.yaml",JSON.stringify(templateDefinitions,null,2)+"\n");
