import { parse } from "yaml";

import { Catalog } from "@/core/catalog";
import type { MarketDataValues } from "@/core/market-data";
import { MarketData } from "@/core/market-data";

import catalogYaml from "./catalog.yaml?raw";
import seededYaml from "./seeded.yaml?raw";

/** The Seed as parsed YAML, before validation. */
export const rawCatalog: unknown = parse(catalogYaml);
export const rawSeeded: unknown = parse(seededYaml);

export const catalog: Catalog = Catalog.schema.parse(rawCatalog);
export const seededMarketData: MarketDataValues = MarketData.seededSchema.parse(rawSeeded);
