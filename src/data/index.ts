import { parse } from "yaml";

import { Catalog } from "@/core/catalog";
import { MarketData } from "@/core/market-data";

import catalogYaml from "./catalog.yaml?raw";
import marketYaml from "./market.yaml?raw";

/** The seed files as parsed YAML, before validation. */
export const rawCatalog: unknown = parse(catalogYaml);
export const rawMarket: unknown = parse(marketYaml);

export const catalog: Catalog = Catalog.schema.parse(rawCatalog);
export const market: MarketData = MarketData.schema.parse(rawMarket);
