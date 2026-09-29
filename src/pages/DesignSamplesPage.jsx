import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DesignSamples from '../components/DesignSamples';
import CallToAction from '../components/CallToAction';

export default function DesignSamplesPage({ onOpenBooking }) {
  return (
    <>
      <PageHeader
        icon={FileSpreadsheet}
        eyebrow="Design Samples"
        title="Solar Designing"
        highlight="Samples & CAD Blueprints"
        description={
          <>
            Explore our real-world 3D layout blueprints, shading path models, and single line diagrams created by Head Engineer{' '}
            <strong className="text-amber-400">GANDHAMANENI GOUTHAM</strong> and Solar Designer{' '}
            <strong className="text-amber-300">Ashish Kumar</strong>.
          </>
        }
      />
      <DesignSamples onOpenBooking={onOpenBooking} />
      <CallToAction onOpenBooking={onOpenBooking} title="Want a design like this for your property?" />
    </>
  );
}
