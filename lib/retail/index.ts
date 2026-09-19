import { collect } from '@/lib/collect';
import { searchAmazon } from '@/lib/retail/amazon';
import { searchFlipkart } from '@/lib/retail/flipkart';
import { searchReliance } from '@/lib/retail/reliance';
import { searchSnapdeal } from '@/lib/retail/snapdeal';
import { searchVijaySales } from '@/lib/retail/vijaysales';

export function searchRetail(q: string) {
  return collect(q, [
    { store: 'amazon', storeName: 'Amazon', run: () => searchAmazon(q) },
    { store: 'flipkart', storeName: 'Flipkart', run: () => searchFlipkart(q) },
    { store: 'reliance', storeName: 'Reliance Digital', run: () => searchReliance(q) },
    { store: 'vijaysales', storeName: 'Vijay Sales', run: () => searchVijaySales(q) },
    { store: 'snapdeal', storeName: 'Snapdeal', run: () => searchSnapdeal(q) },
  ], { priceGuard: true, ignoreColours: true });
}
