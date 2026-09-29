import React from 'react';
import { Calculator } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SolarCalculator from '../components/SolarCalculator';

export default function CalculatorPage({ onOpenBooking }) {
  return (
    <>
      <PageHeader
        icon={Calculator}
        eyebrow="System Calculator"
        title="Calculate Solar Needs for"
        highlight="Your Home or Building"
        description="Input your property specifications below to receive an instant estimate of solar generation, cost breakdown, ROI timeline, and custom equipment sizing."
      />
      <SolarCalculator onOpenBooking={onOpenBooking} />
    </>
  );
}
