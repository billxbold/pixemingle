import Hero from '@/components/Landing/Hero';
import HowItWorks from '@/components/Landing/HowItWorks';
import SoulTypes from '@/components/Landing/SoulTypes';
import Pricing from '@/components/Landing/Pricing';
import Footer from '@/components/Landing/Footer';

export default function Home() {
  return (
    <div className="bg-gray-950 min-h-screen text-white scroll-smooth">
      <Hero />
      <HowItWorks />
      <SoulTypes />
      <Pricing />
      <Footer />
    </div>
  );
}
