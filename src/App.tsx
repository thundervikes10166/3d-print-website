import React from 'react';
import { useLab } from './context/LabContext';
import { Navbar } from './components/Navbar';
import { MarketplaceView } from './components/MarketplaceView';
import { ProductPageView } from './components/ProductPageView';
import { CustomRequestView } from './components/CustomRequestView';
import { StudentDashboardView } from './components/StudentDashboardView';
import { TeacherAdminDashboardView } from './components/TeacherAdminDashboardView';
import { MyRequestsView } from './components/MyRequestsView';
import { CreateEditListingView } from './components/CreateEditListingView';
import { StudentMakerProfileView } from './components/StudentMakerProfileView';
import { StatusSystemGuideModal } from './components/StatusSystemGuideModal';
import { AuthModal } from './components/AuthModal';
import { PaymentGatewayModal } from './components/PaymentGatewayModal';
import { FirebaseConfigBanner } from './components/FirebaseConfigBanner';
import { Footer } from './components/Footer';

export function App() {
  const {
    activeView,
    showPaymentModal,
    closePaymentGateway,
    paymentModalData,
  } = useLab();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-[#C41E3A] selection:text-white">
      
      {/* Firebase Status & Configuration Notification Banner */}
      <FirebaseConfigBanner />

      {/* Main Persistent Navigation */}
      <Navbar />

      {/* Main Dynamic Viewport */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeView === 'marketplace' && <MarketplaceView />}
        {activeView === 'product_detail' && <ProductPageView />}
        {activeView === 'custom_request' && <CustomRequestView />}
        {activeView === 'student_dashboard' && <StudentDashboardView />}
        {activeView === 'teacher_dashboard' && <TeacherAdminDashboardView />}
        {activeView === 'my_requests' && <MyRequestsView />}
        {activeView === 'maker_profile' && <StudentMakerProfileView />}
        {(activeView === 'create_listing' || activeView === 'edit_listing') && (
          <CreateEditListingView />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Modals */}
      <StatusSystemGuideModal />
      <AuthModal />
      <PaymentGatewayModal
        isOpen={showPaymentModal}
        onClose={closePaymentGateway}
        orderId={paymentModalData?.orderId}
        orderTitle={paymentModalData?.orderTitle}
        suggestedAmount={paymentModalData?.amount || 2.5}
      />
    </div>
  );
}

export default App;
