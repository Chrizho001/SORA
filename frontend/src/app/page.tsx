import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { MarqueeStats } from "@/components/sections/MarqueeStats";
import { Features } from "@/components/sections/Features";
import { Demo } from "@/components/sections/Demo";
import { Steps } from "@/components/sections/Steps";
import { Reviews } from "@/components/sections/Reviews";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";
import { Footer } from "@/components/sections/Footer";
import { Rails, Divider } from "@/components/ui/Frame";

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-paper text-ink selection:bg-ink selection:text-paper">
      <Navbar />

      {/* Light Paper Surfaces wrapped in hairline rails */}
      <Rails>
        <main>
          <Hero />
          <Divider />
          <MarqueeStats />
          <Divider />
          <Features />
          <Divider />
          <Demo />
          <Divider />
          <Steps />
          <Divider />
          <Reviews />
          <Divider />
          <Pricing />
          <Divider />
          <Faq />
        </main>
      </Rails>

      {/* Night Theme CTA and Footer */}
      <FinalCta />
      <Footer />
    </div>
  );
}
