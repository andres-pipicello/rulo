import { Catalog } from "@/core/catalog";
import { MarketData } from "@/core/market-data";

import { seedCatalog, seedMarket } from "./seed";

export const catalog: Catalog = Catalog.schema.parse(seedCatalog);
export const market: MarketData = MarketData.schema.parse(seedMarket);
