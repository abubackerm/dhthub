import { AboutHero } from "./components/about-hero";
import { AboutStory } from "./components/about-story";
import { AboutMission } from "./components/about-mission";
import { AboutValues } from "./components/about-values";
import { AboutTimeline } from "./components/about-timeline";
import { AboutCertifications } from "./components/about-certifications";
import { AboutTeam } from "./components/about-team";
import { AboutCta } from "./components/about-cta";
import { ScrollAnimationScript } from "@/components/scroll-animation-script";

export const metadata = {
  title: "About Us | Dynamic Hub Trading",
  description: "Learn about Dynamic Hub Trading - 15+ years of excellence in HVAC, facilities management, and procurement solutions across Saudi Arabia.",
};

export default function AboutPage() {
  return (
    <main>
      <ScrollAnimationScript />
      <AboutHero />
      <AboutStory />
      <AboutMission />
      <AboutValues />
      <AboutTimeline />
      <AboutCertifications />
      <AboutTeam />
      <AboutCta />
    </main>
  );
}
