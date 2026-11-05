import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCatalog, catalogTuples } from "../../scripts/extract-catalog";
import { loadCatalog } from "../../src/catalog/load";
test("41 items, 28 detectors, 43 cards, and nine capabilities stay in sync", async () => {
  const d = await mkdtemp(join(tmpdir(),"maat-catalog-"));
  try {
    const md = await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text();
    await extractCatalog(md,d);
    const c = await loadCatalog(d);
    expect(c.items).toHaveLength(41);
    expect(c.detectors).toHaveLength(28);
    expect(c.rule_cards).toHaveLength(43);
    expect(c.capabilities).toHaveLength(9);
    expect(c.items.map(i => [i.id,i.item_version,i.baseline.proposed_tier]).sort())
      .toEqual(catalogTuples(md).sort());
    expect(c.items.filter(i => i.baseline.proposed_tier === "baseline")).toHaveLength(23);
    expect(c.items.every(i => Array.isArray(i.verification.attestation.requires))).toBe(true);
  } finally { await rm(d,{recursive:true,force:true}); }
});
test("checked-in catalog matches frozen markdown", async () => {
  const c = await loadCatalog("catalog");
  const md = await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text();
  expect(c.items.map(i => [i.id,i.item_version,i.baseline.proposed_tier]).sort())
    .toEqual(catalogTuples(md).sort());
});
