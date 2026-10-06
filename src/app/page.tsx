import { Header } from "@/components/conference/Header";
import { Footer } from "@/components/conference/Footer";
import { NavBar } from "@/components/conference/NavBar";
import { StatsStrip } from "@/components/conference/StatsStrip";
import { AboutSection } from "@/components/conference/AboutSection";
import { ScheduleSection } from "@/components/conference/ScheduleSection";
import { SpeakersSection } from "@/components/conference/SpeakersSection";
import { PartnersSection } from "@/components/conference/PartnersSection";
import { RegistrationCTA } from "@/components/conference/RegistrationCTA";
import { ConferencePortal } from "@/components/conference/ConferencePortal";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8]">
      <Header />

      {/* Sticky navigation appears after scrolling past the hero */}
      <NavBar />

      <main className="flex-1">
        {/* Stats strip overlaps the hero */}
        <StatsStrip />

        {/* About the conference */}
        <div id="about" className="scroll-mt-20">
          <AboutSection />
        </div>

        {/* Interactive tracks + files (the core portal) */}
        <ConferencePortal />

        {/* Conference program schedule */}
        <div id="schedule" className="scroll-mt-20">
          <ScheduleSection />
        </div>

        {/* Speakers & committee */}
        <SpeakersSection />

        {/* Registration call to action */}
        <RegistrationCTA />

        {/* Partners & sponsors */}
        <PartnersSection />
      </main>

      <Footer />
    </div>
  );
}
