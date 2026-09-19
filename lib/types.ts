export type RetailStore = 'amazon' | 'flipkart' | 'reliance' | 'vijaysales' | 'snapdeal';
/** Stores we can't read automatically (they block servers) but can send people to. */
export type LinkOnlyStore = 'croma' | 'tatacliq' | 'nykaa' | 'myntra' | 'ajio';
export type SneakerStore = 'crepdogcrew' | 'mainstreet' | 'superkicks' | 'dawntown' | 'limitededt' | 'vegnonveg';
export type StoreId = RetailStore | SneakerStore | LinkOnlyStore;

export type Offer = {
  store: StoreId;
  storeName: string;
  title: string;
  brand?: string;
  image?: string;
  url: string;
  price: number;
  mrp?: number;
  inStock: boolean;
  /** Anything the buyer must know before tapping, e.g. "Ships in 28 days". */
  note?: string;
};

export type StoreStatus = {
  store: StoreId;
  storeName: string;
  ok: boolean;
  /** Listings that survived matching. */
  matched: number;
  error?: string;
};

/** The same product across stores, cheapest in-stock store first. */
export type OfferGroup = {
  key: string;
  title: string;
  image?: string;
  best: Offer | null;
  offers: Offer[];
  /** How many identifying words go beyond the query; lower is a closer match. */
  extra: number;
};

export type SearchResult = {
  query: string;
  size?: string;
  /** Closest-matching product first; each lists its stores cheapest first. */
  groups: OfferGroup[];
  stores: StoreStatus[];
  /** True when nothing matched strictly and these are the closest matches. */
  loose: boolean;
  checkedAt: string;
  /** While streaming: stores that haven't answered yet. */
  pending?: string[];
};
