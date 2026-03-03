import { DHTHero } from "./components/dht-hero";
import { DHTFeatureCards } from "./components/dht-feature-cards";
import { DHTAbout } from "./components/dht-about";
import { DHTMissionVision } from "./components/dht-mission-vision";
import { DHTServices } from "./components/dht-services";
import { DHTProcurement } from "./components/dht-procurement";
import { DHTStats } from "./components/dht-stats";
import { DHTClients } from "./components/dht-clients";
import { DHTDealerCTA } from "./components/dht-dealer-cta";
import { DHTExpertiseBanner } from "./components/dht-expertise-banner";

export default function HomePage() {
    return (
        <>
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
        </>
    );
}
