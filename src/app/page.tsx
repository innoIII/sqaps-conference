import { Header } from "@/components/conference/Header";
import { Footer } from "@/components/conference/Footer";
import { NavBar } from "@/components/conference/NavBar";
import { StatsStrip } from "@/components/conference/StatsStrip";
import { AboutSection } from "@/components/conference/AboutSection";
import { ScheduleSection } from "@/components/conference/ScheduleSection";
import { ConferencePortal } from "@/components/conference/ConferencePortal";
import { OrnamentDivider } from "@/components/conference/OrnamentDivider";
import { ConferenceCountdown } from "@/components/conference/ConferenceCountdown";
import { ConferenceThemes } from "@/components/conference/ConferenceThemes";
import { PartnersStrip } from "@/components/conference/PartnersStrip";
import { SpeakersSection } from "@/components/conference/SpeakersSection";
import { RegistrationCTA } from "@/components/conference/RegistrationCTA";

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

        {/* Conference themes grid */}
        <ConferenceThemes />

        {/* Keynote speakers */}
        <SpeakersSection />

        {/* Countdown to the conference */}
        <ConferenceCountdown />

        <OrnamentDivider className="my-2" />

        {/* Interactive tracks + files (the core portal) */}
        <ConferencePortal />

        <OrnamentDivider className="my-2" />

        {/* Conference program schedule (2 days) */}
        <div id="schedule" className="scroll-mt-20">
          <ScheduleSection />
        </div>

        {/* Registration call-to-action */}
        <RegistrationCTA />

        {/* Organizing partners */}
        <PartnersStrip />
      </main>

      <Footer />
    </div>
  );
}
