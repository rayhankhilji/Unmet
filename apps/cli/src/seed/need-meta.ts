import type { NeedKey } from "./fixture-schema.ts";

/** Labels and descriptions the need-label prompt would produce for the fixture clusters. */
export const NEED_META: Record<NeedKey, { label: string; description: string }> = {
  "dry-sunscreen": {
    label: "Sunscreen that doesn't dry out skin",
    description:
      "People with dry, reactive or combination skin mix moisturiser, oil or serum into their sunscreen, or layer and wait, because their SPF leaves skin tight by midday.",
  },
  "pilling-spf": {
    label: "Sunscreen that doesn't pill under makeup",
    description:
      "Sunscreen rolls into flakes under foundation, concealer or serums, so people pat it in for minutes or skip makeup.",
  },
  "gentle-retinol": {
    label: "Fragrance-free retinol for sensitive skin",
    description:
      "People with sensitive skin want a retinoid without fragrance that doesn't sting; most say they gave up after reactions.",
  },
  "vitc-dupe": {
    label: "Cheaper alternative to a premium vitamin C serum",
    description:
      "Viewers hunt for a lower-priced vitamin C serum that performs like an expensive one; much of the volume comes from one budget creator.",
  },
  "mineral-cleanser": {
    label: "Cleanser that removes mineral SPF without stripping",
    description:
      "Water-resistant and mineral sunscreens need an oil or balm plus a second cleanse, which leaves sensitive skin raw or stinging.",
  },
};
