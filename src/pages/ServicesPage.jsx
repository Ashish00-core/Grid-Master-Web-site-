import React from 'react';
import { Layers } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Services from '../components/Services';
import CallToAction from '../components/CallToAction';

export default function ServicesPage({ onOpenBooking }) {
  return (
    <>
      <PageHeader
        icon={Layers}
        eyebrow="Services"
        title="Complete Solar Solutions for"
        highlight="Homes & Commercial Buildings"
        description="From single-family rooftop designs to megawatt commercial building integration, Grid Master delivers end-to-end solar engineering, installation, and utility grid interconnection."
      />
      <Services onOpenBooking={onOpenBooking} />
      <CallToAction onOpenBooking={onOpenBooking} />
    </>
  );
}
