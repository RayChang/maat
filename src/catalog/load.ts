import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MaatError } from "../errors";
import type { Catalog, CatalogItem, RegistryEntry } from "./types";
export async function loadCatalog(root?: string): Promise<Catalog> {
  const here=dirname(fileURLToPath(import.meta.url));
  const path=resolve(root ?? (existsSync(join(here,"../../catalog")) ? join(here,"../../catalog") : join(here,"../catalog")));
  try {
    async function read<T>(file:string):Promise<T> {
      return Bun.YAML.parse(await readFile(join(path,file),"utf8")) as T;
    }
    async function dir<T>(name:string):Promise<T[]> {
      const names=(await readdir(join(path,name))).filter(n=>n.endsWith(".yaml")).sort();
      return Promise.all(names.map(n=>read<T>(name+"/"+n)));
    }
    const meta=await read<{catalog_version:string;approved:boolean;source_metadata:string}>("metadata.json");
    return {root:path,...meta,items:await dir<CatalogItem>("items"),
      rule_cards:await dir<RegistryEntry>("rule-cards"),
      capabilities:await read<RegistryEntry[]>("capabilities.yaml"),
      detectors:await read<RegistryEntry[]>("detectors.yaml"),
      templates:await read<RegistryEntry[]>("templates.yaml")};
  } catch { throw new MaatError(3,"catalog_parse: unreadable or invalid catalog"); }
}
