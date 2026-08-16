import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AIChatbox from '../../features/ai-search/AIChatbox';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isDashboard = ['/admin-dashboard', '/owner-dashboard', '/staff-dashboard'].includes(location.pathname);
  const isAuthPage = ['/login', '/register', '/register/owner', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isCheckoutOrPayment = ['/checkout', '/payment'].includes(location.pathname);

  if (isDashboard || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f6f8]">
      {!isCheckoutOrPayment && <Navbar />}
      <main className="flex-grow pb-10">
        {children}
      </main>
      {!isCheckoutOrPayment && <Footer />}
      {!isCheckoutOrPayment && <AIChatbox />}
    </div>
  );
};

export default Layout;
