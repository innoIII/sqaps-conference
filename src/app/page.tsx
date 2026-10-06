import { Header } from "@/components/conference/Header";
import { Footer } from "@/components/conference/Footer";
import { StatsStrip } from "@/components/conference/StatsStrip";
import { AboutSection } from "@/components/conference/AboutSection";
import { ScheduleSection } from "@/components/conference/ScheduleSection";
import { ConferencePortal } from "@/components/conference/ConferencePortal";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8]">
      <Header />

      <main className="flex-1">
        {/* Stats strip overlaps the hero */}
        <StatsStrip />

        {/* About the conference */}
        <AboutSection />

        {/* Interactive tracks + files (the core portal) */}
        <ConferencePortal />

        {/* Conference program schedule */}
        <ScheduleSection />
      </main>

      <Footer />
    </div>
  );
}
