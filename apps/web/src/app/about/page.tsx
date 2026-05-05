import { DHTHero } from "../(home)/components/dht-hero";
import { DHTFeatureCards } from "../(home)/components/dht-feature-cards";
import { DHTAbout } from "../(home)/components/dht-about";
import { DHTMissionVision } from "../(home)/components/dht-mission-vision";
import { DHTServices } from "../(home)/components/dht-services";
import { DHTProcurement } from "../(home)/components/dht-procurement";
import { DHTStats } from "../(home)/components/dht-stats";
import { DHTClients } from "../(home)/components/dht-clients";
import { DHTDealerCTA } from "../(home)/components/dht-dealer-cta";
import { DHTExpertiseBanner } from "../(home)/components/dht-expertise-banner";

export const metadata = {
  title: "About Us | Dynamic Hub Trading",
  description: "Learn about Dynamic Hub Trading - 15+ years of excellence in HVAC, facilities management, and procurement solutions across Saudi Arabia.",
};

export default function AboutPage() {
  return (
    <main>
      <DHTHero />
      <DHTFeatureCards />
      <DHTAbout />
      <DHTMissionVision />
      <DHTServices />
      <DHTProcurement />
      <DHTStats />
      <DHTClients />
      <DHTDealerCTA />
      <DHTExpertiseBanner />
    </main>
  );
}
