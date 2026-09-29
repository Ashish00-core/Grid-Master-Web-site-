import React from 'react';
import { Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Team from '../components/Team';
import VisitingCard from '../components/VisitingCard';
import CallToAction from '../components/CallToAction';

export default function TeamPage({ onOpenVisitingCard, onOpenBooking }) {
  return (
    <>
      <PageHeader
        icon={Users}
        eyebrow="Engineering Team"
        title="Our Certified"
        highlight="Solar & Electrical Engineers"
        description="Meet the Grid Master engineering team dedicated to high-performance residential and commercial solar designs, electrical schematics, and seamless grid integration."
      />
      <Team onOpenVisitingCard={onOpenVisitingCard} onOpenBooking={onOpenBooking} />
      <VisitingCard />
      <div className="pt-16 sm:pt-24">
        <CallToAction onOpenBooking={onOpenBooking} title="Work directly with our engineers" />
      </div>
    </>
  );
}
