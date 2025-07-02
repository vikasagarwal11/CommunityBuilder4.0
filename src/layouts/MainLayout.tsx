import { Outlet } from 'react-router-dom';
import Header from '../components/navigation/Header';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const MainLayout = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const isMobileApp = Capacitor.isNativePlatform();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Don't show header in mobile app if on native platform */}
      {!isMobileApp && <Header isScrolled={isScrolled} />}
      <main className={`flex-grow ${isMobileApp ? 'pt-0 pb-16' : ''}`}>
        <Outlet />
      </main>
      {/* Footer removed */}
    </div>
  );
};

export default MainLayout;