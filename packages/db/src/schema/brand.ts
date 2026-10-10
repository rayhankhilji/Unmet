import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, embedding, id } from "./columns.ts";

export const brand = pgTable("brand", {
  id: id(),
  slug: text("slug").notNull().unique("brand_slug_unique"),
  name: text("name").notNull(),
  positioning: text("positioning").notNull(),
  createdAt: createdAt(),
});

export const catalogProduct = pgTable(
  "catalog_product",
  {
    id: id(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    format: text("format").notNull(),
    keyIngredients: text("key_ingredients").array().notNull(),
    claims: text("claims").array().notNull(),
    skinTypes: text("skin_types").array().notNull(),
    url: text("url").notNull(),
    embedding: embedding("embedding"),
  },
  (t) => [index("catalog_product_brand_id_idx").on(t.brandId)],
);
