import type { LinkOnlyStore, StoreId } from '@/lib/types';

const slug = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Where to send someone to search a store themselves. */
export function storeSearchUrl(store: StoreId, q: string): string {
  const e = encodeURIComponent(q);
  switch (store) {
    case 'amazon':
      return `https://www.amazon.in/s?k=${e}`;
    case 'flipkart':
      return `https://www.flipkart.com/search?q=${e}`;
    case 'reliance':
      return `https://www.reliancedigital.in/products?q=${e}`;
    case 'vijaysales':
      return `https://www.vijaysales.com/search-listing?q=${e}`;
    case 'snapdeal':
      return `https://www.snapdeal.com/search?keyword=${e}`;
    case 'croma':
      return `https://www.croma.com/searchB?q=${e}%3Arelevance&text=${e}`;
    case 'tatacliq':
      return `https://www.tatacliq.com/search/?searchCategory=all&text=${e}`;
    case 'nykaa':
      return `https://www.nykaa.com/search/result/?q=${e}`;
    case 'myntra':
      return `https://www.myntra.com/${slug(q)}?rawQuery=${e}`;
    case 'ajio':
      return `https://www.ajio.com/search/?text=${e}`;
    case 'crepdogcrew':
      return `https://crepdogcrew.com/search?q=${e}`;
    case 'mainstreet':
      return `https://marketplace.mainstreet.co.in/search?q=${e}`;
    case 'superkicks':
      return `https://www.superkicks.in/search?q=${e}`;
    case 'dawntown':
      return `https://dawntown.co.in/search?q=${e}`;
    case 'limitededt':
      return `https://www.limitededt.in/search?q=${e}`;
    case 'vegnonveg':
      return `https://www.vegnonveg.com/search?q=${e}`;
  }
}

export const RETAIL_STORES = ['Amazon', 'Flipkart', 'Reliance Digital', 'Vijay Sales', 'Snapdeal'];
export const SNEAKER_STORES = ['Crep Dog Crew', 'Mainstreet', 'Superkicks', 'Dawntown', 'Limited Edt', 'VegNonVeg'];

/** These block automatic checks from servers, so we offer a pre-filled search link instead. */
export const LINK_ONLY: { store: LinkOnlyStore; name: string; forSneakers: boolean }[] = [
  { store: 'croma', name: 'Croma', forSneakers: false },
  { store: 'tatacliq', name: 'Tata CLiQ', forSneakers: true },
  { store: 'myntra', name: 'Myntra', forSneakers: true },
  { store: 'nykaa', name: 'Nykaa', forSneakers: false },
  { store: 'ajio', name: 'Ajio', forSneakers: true },
];

export const STORE_NAMES: Record<StoreId, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  reliance: 'Reliance Digital',
  vijaysales: 'Vijay Sales',
  snapdeal: 'Snapdeal',
  croma: 'Croma',
  tatacliq: 'Tata CLiQ',
  myntra: 'Myntra',
  nykaa: 'Nykaa',
  ajio: 'Ajio',
  crepdogcrew: 'Crep Dog Crew',
  mainstreet: 'Mainstreet',
  superkicks: 'Superkicks',
  dawntown: 'Dawntown',
  limitededt: 'Limited Edt',
  vegnonveg: 'VegNonVeg',
};
