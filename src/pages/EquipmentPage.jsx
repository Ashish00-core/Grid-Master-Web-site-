import React from 'react';
import { ShoppingBag } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EquipmentCatalog from '../components/EquipmentCatalog';

export default function EquipmentPage(props) {
  return (
    <>
      <PageHeader
        icon={ShoppingBag}
        eyebrow="Equipment & Prices"
        title="Tier-1 Solar Hardware"
        highlight="& Component Prices"
        description="Explore authentic prices for high-efficiency N-type solar modules, smart hybrid inverters, LiFePO4 battery banks, and wind-tested racking systems certified by Grid Master."
      />
      <EquipmentCatalog {...props} />
    </>
  );
}
