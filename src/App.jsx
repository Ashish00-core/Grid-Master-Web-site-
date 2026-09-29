import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import DesignSamplesPage from './pages/DesignSamplesPage';
import EquipmentPage from './pages/EquipmentPage';
import CalculatorPage from './pages/CalculatorPage';
import TeamPage from './pages/TeamPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import VisitingCard from './components/VisitingCard';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import WhatsAppButton from './components/WhatsAppButton';

export default function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState('');
  const [isVisitingCardModalOpen, setIsVisitingCardModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const { pathname } = useLocation();

  const handleOpenBooking = (serviceName = '') => {
    setBookingService(serviceName);
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingOpen(false);
    setBookingService('');
  };

  const handleOpenVisitingCardModal = () => {
    setIsVisitingCardModalOpen(true);
  };

  const handleCloseVisitingCardModal = () => {
    setIsVisitingCardModalOpen(false);
  };

  const handleAddToQuote = (item) => {
    if (selectedEquipment.some(e => e.id === item.id)) {
      setSelectedEquipment(selectedEquipment.filter(e => e.id !== item.id));
    } else {
      setSelectedEquipment([...selectedEquipment, { ...item, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (id, delta) => {
    setSelectedEquipment(prev =>
      prev
        .map(e =>
          e.id === id ? { ...e, quantity: Math.min(99, e.quantity + delta) } : e
        )
        .filter(e => e.quantity > 0)
    );
  };

  const handleClearQuote = () => {
    setSelectedEquipment([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      <ScrollToTop />

      {/* Sticky Header */}
      <Navbar 
        onOpenBooking={handleOpenBooking} 
        onOpenVisitingCard={handleOpenVisitingCardModal}
      />

      {/* Each menu item is its own page */}
      <main className="flex-grow">
        <div key={pathname} className="page-enter">
          <Routes>
            <Route path="/" element={<HomePage onOpenBooking={handleOpenBooking} onOpenVisitingCard={handleOpenVisitingCardModal} />} />
            <Route path="/services" element={<ServicesPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/design-samples" element={<DesignSamplesPage onOpenBooking={handleOpenBooking} />} />
            <Route
              path="/equipment"
              element={
                <EquipmentPage
                  onAddToQuote={handleAddToQuote}
                  onUpdateQuantity={handleUpdateQuantity}
                  onClearQuote={handleClearQuote}
                  selectedEquipment={selectedEquipment}
                  onOpenBooking={handleOpenBooking}
                />
              }
            />
            <Route path="/calculator" element={<CalculatorPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/team" element={<TeamPage onOpenVisitingCard={handleOpenVisitingCardModal} onOpenBooking={handleOpenBooking} />} />
            <Route path="/contact" element={<ContactPage onOpenBooking={handleOpenBooking} onOpenVisitingCard={handleOpenVisitingCardModal} />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>

      {/* Footer */}
      <Footer 
        onOpenBooking={handleOpenBooking}
        onOpenVisitingCard={handleOpenVisitingCardModal}
      />

      {/* Modal Dialogs */}
      <BookingModal 
        isOpen={isBookingOpen}
        onClose={handleCloseBooking}
        initialService={bookingService}
        quoteItems={selectedEquipment}
      />

      {isVisitingCardModalOpen && (
        <VisitingCard 
          isModal={true}
          onClose={handleCloseVisitingCardModal}
        />
      )}

      {/* Floating WhatsApp Contact Button */}
      <WhatsAppButton />

    </div>
  );
}
