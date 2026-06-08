import { Shield, Zap, Users, Heart, Lightbulb, Award } from "lucide-react";
import { ScrollReveal } from "@/components/public/ScrollReveal";

const values = [
  {
    icon: Shield,
    title: "Safety First",
    description: "We prioritize well-being of our team, clients, and communities in every decision and action.",
  },
  {
    icon: Zap,
    title: "Continuous Innovation",
    description: "Embracing cutting-edge technologies and methodologies to deliver superior solutions.",
  },
  {
    icon: Users,
    title: "Client-Centric Approach",
    description: "Understanding unique needs and delivering tailored solutions that drive success.",
  },
  {
    icon: Heart,
    title: "Environmental Stewardship",
    description: "Committing to sustainable practices that protect our planet for future generations.",
  },
  {
    icon: Lightbulb,
    title: "Expertise & Excellence",
    description: "Leveraging deep industry knowledge to maintain highest quality standards.",
  },
  {
    icon: Award,
    title: "Certified Quality",
    description: "Maintaining internationally recognized certifications and compliance standards.",
  },
];

export function AboutValues() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal animation="fade-up" threshold={0.2} className="text-center mb-20">
          <p className="text-(--dht-red) font-semibold uppercase tracking-wider mb-3 text-sm">
            What We Stand For
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-(--dht-dark) mb-4">
            Our Core Values
          </h2>
          <p className="text-(--dht-gray) max-w-2xl mx-auto">
            The principles that guide every decision we make and every action we take.
          </p>
        </ScrollReveal>

        {/* Zigzag/Masonry Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
            const isShifted = index % 2 === 1;

            return (
              <ScrollReveal
                key={index}
                animation="fade-up"
                delay={index * 100}
                className={`relative bg-(--dht-gray-light) rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group ${isShifted ? 'lg:mt-8' : ''}`}
              >
                {/* Icon Container */}
                <div className="w-14 h-14 bg-(--dht-red) rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-(--dht-dark) mb-3">
                  {value.title}
                </h3>

                {/* Description */}
                <p className="text-(--dht-gray) leading-relaxed">
                  {value.description}
                </p>

                {/* Decorative Accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-(--dht-red) opacity-0 group-hover:opacity-5 rounded-bl-full transition-opacity duration-300" />
              </ScrollReveal>
            );
          })}
        </div>

        {/* Bottom Quote */}
        <ScrollReveal animation="fade-up" delay={200} className="mt-20 text-center">
          <div className="inline-block relative">
            <div className="absolute -top-4 -left-4 text-8xl text-(--dht-red) opacity-10 font-serif">&ldquo;</div>
            <p className="text-xl md:text-2xl font-medium text-(--dht-dark) max-w-3xl mx-auto italic relative z-10">
              Our values are not just words on a page—they are foundation of our culture and
              driving force behind our success.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
