import { Header } from "@/components/conference/Header";
import { Footer } from "@/components/conference/Footer";
import { ConferencePortal } from "@/components/conference/ConferencePortal";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8]">
      <Header />
      <main className="flex-1">
        <ConferencePortal />
      </main>
      <Footer />
    </div>
  );
}
