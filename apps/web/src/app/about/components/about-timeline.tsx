import { Calendar, Building, Award, Globe, ChevronRight } from "lucide-react";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { CountUp } from "@/components/public/CountUp";

const milestones = [
  {
    year: "2008",
    title: "Dynamic Hub Founded",
    description: "Established in Eastern Province of Saudi Arabia with focus on HVAC solutions.",
    icon: Building,
  },
  {
    year: "2012",
    title: "First Major Contract",
    description: "Awarded significant HVAC project for leading industrial facility.",
    icon: Calendar,
  },
  {
    year: "2015",
    title: "Saudi Aramco Approval",
    description: "Became approved vendor for Saudi Aramco, validating quality standards.",
    icon: Award,
  },
  {
    year: "2018",
    title: "Global Expansion",
    description: "Extended services to offshore and marine sectors across GCC region.",
    icon: Globe,
  },
  {
    year: "2023",
    title: "500+ Projects Milestone",
    description: "Celebrated 500+ successful projects across multiple industries.",
    icon: Building,
  },
  {
    year: "2024",
    title: "Digital Transformation",
    description: "Launched digital catalog and enhanced procurement platform.",
    icon: Globe,
  },
];

export function AboutTimeline() {
  return (
    <section className="py-24 bg-(--dht-dark) relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-[0.02]" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-(--dht-red)/5 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <ScrollReveal animation="fade-up" threshold={0.2} className="text-center mb-20">
          <p className="text-(--dht-red) font-semibold uppercase tracking-wider mb-3 text-sm">
            Our Journey
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Timeline of Excellence
          </h2>
          <p className="text-(--dht-gray) max-w-2xl mx-auto">
            Key milestones that shaped our path to becoming industry leaders.
          </p>
        </ScrollReveal>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          <div className="text-center">
            <CountUp target={15} suffix="+" className="text-4xl md:text-5xl font-bold text-(--dht-red) mb-2" />
            <div className="text-(--dht-gray) text-sm uppercase tracking-wider">Years Experience</div>
          </div>
          <div className="text-center">
            <CountUp target={500} suffix="+" className="text-4xl md:text-5xl font-bold text-(--dht-red) mb-2" />
            <div className="text-(--dht-gray) text-sm uppercase tracking-wider">Projects Completed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-(--dht-red) mb-2">50+</div>
            <div className="text-(--dht-gray) text-sm uppercase tracking-wider">Team Members</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-(--dht-red) mb-2">99%</div>
            <div className="text-(--dht-gray) text-sm uppercase tracking-wider">Client Satisfaction</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-linear-to-b from-(--dht-red) via-(--dht-red)/50 to-transparent -translate-x-1/2 hidden md:block">
            <div className="w-full h-full animate-draw-line" />
          </div>

          {/* Timeline Items */}
          <div className="space-y-12 md:space-y-0">
            {milestones.map((milestone, index) => {
              const isLeft = index % 2 === 0;
              const Icon = milestone.icon;

              return (
                <div
                  key={index}
                  className={`relative flex items-center justify-center md:justify-start ${
                    isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Content Card */}
                  <ScrollReveal
                    animation={isLeft ? "fade-left" : "fade-right"}
                    threshold={0.3}
                    delay={index * 100}
                    className={`w-full md:w-[calc(50%-2rem)] relative`}
                  >
                    {/* Card */}
                    <div className={`bg-(--dht-darker) rounded-2xl p-8 hover:bg-(--dht-dark) transition-colors duration-300 group ${isLeft ? 'md:mr-8' : 'md:ml-8'}`}>
                      {/* Year Badge */}
                      <div className="inline-flex items-center gap-2 bg-(--dht-red) text-white px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider mb-4 pulse-red">
                        {milestone.year}
                      </div>

                      {/* Icon */}
                      <div className="w-12 h-12 bg-(--dht-red)/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-(--dht-red)/30 transition-colors duration-300">
                        <Icon className="w-6 h-6 text-(--dht-red)" />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-3">{milestone.title}</h3>

                      {/* Description */}
                      <p className="text-(--dht-gray) leading-relaxed">{milestone.description}</p>

                      {/* Arrow Indicator (Desktop) */}
                      <div className={`absolute top-1/2 ${isLeft ? 'md:-right-4 md:translate-x-1/2' : 'md:-left-4 md:-translate-x-1/2'} hidden md:flex items-center justify-center w-8 h-8 bg-(--dht-red) rounded-full`}>
                        <ChevronRight className={`w-4 h-4 text-white ${isLeft ? '' : 'rotate-180'}`} />
                      </div>
                    </div>

                    {/* Center Dot (Desktop) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-(--dht-red) rounded-full border-4 border-(--dht-dark) hidden md:block z-10" />
                  </ScrollReveal>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
