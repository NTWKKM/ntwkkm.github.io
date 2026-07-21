import React from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';

export const App: React.FC = () => {
  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <Navbar />
      <HeroSection />
    </div>
  );
};

export default App;
