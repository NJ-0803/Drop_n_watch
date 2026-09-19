import type { Metadata } from 'next';
import { SneakerView } from '@/components/SneakerView';

export const metadata: Metadata = {
  title: 'Sneaker rates · Dropwatch',
  description: 'Pick your UK size and see every Indian sneaker reseller’s price for it, cheapest first.',
};

export default function SneakersPage() {
  return <SneakerView />;
}
