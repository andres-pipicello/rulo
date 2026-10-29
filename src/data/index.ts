import { parse } from "yaml";

import { Catalog } from "@/core/catalog";
import type { MarketDataValues } from "@/core/market-data";
import { MarketData } from "@/core/market-data";

import catalogYaml from "./catalog.yaml?raw";
import fixedYaml from "./fixed.yaml?raw";

/** The seed files as parsed YAML, before validation. */
export const rawCatalog: unknown = parse(catalogYaml);
export const rawFixed: unknown = parse(fixedYaml);

export const catalog: Catalog = Catalog.schema.parse(rawCatalog);
export const fixedMarketData: MarketDataValues = MarketData.fixedSchema.parse(rawFixed);
