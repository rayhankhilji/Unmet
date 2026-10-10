import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Queryable, Tx } from "@unmet/db";
import { brand, catalogProduct, creator, evalRun, investigation, video } from "@unmet/db/schema";
import { BrandFile } from "@unmet/shared";
import { seededUuid } from "@unmet/shared/testing";
import { and, eq, inArray, like } from "drizzle-orm";
import { insertCorpus } from "./corpus.ts";
import { E2E_EVAL_NOTE, seedEvalFixtures } from "./eval-fixtures.ts";
import { FixtureCorpus } from "./fixture-schema.ts";
import { seedRuns } from "./runs.ts";

export type SeedOptions = { root: string; e2e: boolean };
export type SeedSummary = {
  brands: number;
  videos: number;
  creators: number;
  signals: number;
  investigations: { published: string; failed: string; running: string };
  evalRuns: number;
};

const FIXTURE_BRAND = "fixture-skin";

/** Brands committed under data/brands; lrp-like joins in P3.T1 once its catalogue is verified. */
export function loadBrandFiles(root: string): BrandFile[] {
  const dir = join(root, "data", "brands");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const parsed = BrandFile.safeParse(JSON.parse(readFileSync(join(dir, f), "utf8")));
      if (!parsed.success) {
        throw new Error(
          `${f}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
        );
      }
      return parsed.data;
    });
}

export function loadFixtureCorpus(root: string): FixtureCorpus {
  const raw = JSON.parse(
    readFileSync(join(root, "fixtures", "corpus-small", "corpus.json"), "utf8"),
  );
  return FixtureCorpus.parse(raw);
}

/** Removes anything a previous seed wrote, so seeding is repeatable on a shared database. */
async function clearPreviousSeed(tx: Tx, slugs: string[]): Promise<void> {
  const brands = await tx.select({ id: brand.id }).from(brand).where(inArray(brand.slug, slugs));
  const brandIds = brands.map((b) => b.id);
  if (brandIds.length > 0)
    await tx.delete(investigation).where(inArray(investigation.brandId, brandIds));
  await tx.delete(evalRun).where(eq(evalRun.notes, E2E_EVAL_NOTE));
  await tx
    .delete(video)
    .where(and(eq(video.platform, "synthetic"), like(video.externalId, "fx-%")));
  await tx
    .delete(creator)
    .where(and(eq(creator.platform, "synthetic"), like(creator.handle, "fx\\_%")));
  if (brandIds.length > 0) await tx.delete(brand).where(inArray(brand.id, brandIds));
}

async function insertBrands(tx: Tx, brands: BrandFile[], nextId: () => string) {
  const products = new Map<string, string>();
  let fixtureBrandId: string | null = null;
  for (const b of brands) {
    const brandId = nextId();
    if (b.slug === FIXTURE_BRAND) fixtureBrandId = brandId;
    await tx
      .insert(brand)
      .values({ id: brandId, slug: b.slug, name: b.name, positioning: b.positioning });
    for (const p of b.catalogue) {
      const id = nextId();
      if (b.slug === FIXTURE_BRAND) products.set(p.name, id);
      await tx.insert(catalogProduct).values({ id, brandId, ...p });
    }
  }
  if (!fixtureBrandId)
    throw new Error(`data/brands/${FIXTURE_BRAND}.json is required for the seed`);
  return { fixtureBrandId, products };
}

export async function seed(db: Queryable, options: SeedOptions): Promise<SeedSummary> {
  const brands = loadBrandFiles(options.root);
  const corpus = loadFixtureCorpus(options.root);
  const nextId = seededUuid("unmet-seed");

  return db.transaction(async (tx) => {
    await clearPreviousSeed(
      tx,
      brands.map((b) => b.slug),
    );

    const { fixtureBrandId, products } = await insertBrands(tx, brands, nextId);

    const signals = await insertCorpus(tx, corpus, nextId);
    const investigations = await seedRuns({
      tx,
      nextId,
      brandId: fixtureBrandId,
      signals,
      products,
    });
    const evalRuns = options.e2e ? await seedEvalFixtures(tx, nextId) : 0;

    return {
      brands: brands.length,
      videos: corpus.videos.length,
      creators: corpus.creators.length,
      signals: signals.length,
      investigations,
      evalRuns,
    };
  });
}
