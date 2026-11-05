import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CatalogItem, RegistryEntry } from "../src/catalog/types";
function blocks(markdown: string): CatalogItem[] {
  const section = markdown.split("## 8. ")[1]?.split("## 9. ")[0] ?? "";
  return [...section.matchAll(/\x60{3}yaml\n([\s\S]*?)\x60{3}/g)]
    .map(m => Bun.YAML.parse(m[1]!) as CatalogItem);
}
export function catalogTuples(markdown: string): [string,number,string][] {
  return blocks(markdown).map(i => [i.id,i.item_version,i.baseline.proposed_tier]);
}
export async function extractCatalog(markdown: string, out: string): Promise<void> {
  const items = blocks(markdown);
  if (items.length !== 41) throw Error("catalog_count: expected 41");
  for (const sub of ["items","rule-cards"]) await mkdir(join(out,sub),{recursive:true});
  const cards = new Map<string,RegistryEntry>();
  for (const item of items) {
    const a = item.verification.attestation as unknown;
    if (typeof a === "string") item.verification.attestation = {
      question:a, requires:["範圍","證據指紋","catalog 與 adapter 版本","確認者","有效期限"]
    };
    await writeFile(join(out,"items",item.id+".yaml"),JSON.stringify(item,null,2)+"\n");
    for (const card of item.remediation.rule_cards) {
      const entry = cards.get(card.id) ?? { ...card, contracts: [] };
      (entry.contracts as unknown[]).push({ check:item.id, item_version:item.item_version,
        actions:item.remediation.actions, targets:item.remediation.targets,
        risk:item.remediation.risk, needs_approval:item.remediation.needs_approval,
        verification:item.verification, derived_from:item.sources });
      cards.set(card.id,entry);
    }
  }
  for (const card of cards.values())
    await writeFile(join(out,"rule-cards",card.id+".yaml"),JSON.stringify(card,null,2)+"\n");
  function table(start:string,end:string): RegistryEntry[] {
    const section = markdown.split(start)[1]?.split(end)[0] ?? "";
    return section.split("\n").filter(l => /^\| \x60[^\x60]+@1\x60 \|/.test(l)).map(line => {
      const cells=line.split("|").slice(1,-1).map(s=>s.trim());
      return { id:cells[0]!.replaceAll("\u0060",""),version:1,contract:cells.slice(1) };
    });
  }
  await writeFile(join(out,"capabilities.yaml"),JSON.stringify(table("### 7.1 ","### 7.2 "),null,2)+"\n");
  await writeFile(join(out,"detectors.yaml"),JSON.stringify(table("### 10.1 ","### 10.2 "),null,2)+"\n");
  await writeFile(join(out,"templates.yaml"),"[]\n");
  await writeFile(join(out,"metadata.json"),JSON.stringify({
    catalog_version:"0.1.0",approved:true,
    source_metadata:markdown.split("## 5. ")[1]!.split("## 7. ")[0]
  },null,2)+"\n");
}
if (import.meta.main)
  await extractCatalog(await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text(),"catalog");
