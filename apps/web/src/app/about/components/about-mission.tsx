import { Target, Eye, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/public/ScrollReveal";

export function AboutMission() {
  return (
    <section className="py-24 bg-(--dht-gray-light) relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-[0.02]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <ScrollReveal animation="fade-up" threshold={0.2} className="text-center mb-16">
          <p className="text-(--dht-red) font-semibold uppercase tracking-wider mb-3 text-sm">
            Our Purpose
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-(--dht-dark)">
            Mission, Vision & Values
          </h2>
        </ScrollReveal>

        {/* Cards Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Mission Card */}
          <ScrollReveal animation="fade-left" threshold={0.3}>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-500">
              {/* Icon */}
              <div className="w-16 h-16 bg-(--dht-red) rounded-xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>

              {/* Heading */}
              <h3 className="text-2xl font-bold text-(--dht-dark) mb-4">Our Mission</h3>

              {/* Content */}
              <p className="text-(--dht-gray) leading-relaxed mb-6">
                To deliver exceptional HVAC, facilities management, and procurement solutions that exceed
                client expectations while maintaining highest standards of safety, quality, and
                reliability in every project we undertake.
              </p>

              {/* Accent Line */}
              <div className="w-16 h-1 bg-(--dht-red) rounded-full" />
            </div>
          </ScrollReveal>

          {/* Vision Card - Overlapping on Desktop */}
          <ScrollReveal animation="fade-right" threshold={0.3}>
            <div className="relative bg-(--dht-dark) text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-500 lg:-mt-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-(--dht-red) rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>

              {/* Heading */}
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>

              {/* Content */}
              <p className="text-(--dht-gray) leading-relaxed mb-6">
                To be leading integrated solutions provider in Middle East, recognized for
                innovation, operational excellence, and unwavering commitment to sustainable growth
                and client success.
              </p>

              {/* Accent Line */}
              <div className="w-16 h-1 bg-(--dht-red) rounded-full" />
            </div>
          </ScrollReveal>
        </div>

        {/* Core Values */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          <ScrollReveal animation="fade-up" delay={0}>
            <div className="bg-white rounded-xl p-6 text-center hover:transform hover:-translate-y-2 transition-transform duration-300 shadow-lg">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-(--dht-red)" />
              <h4 className="font-bold text-(--dht-dark) mb-2">Excellence</h4>
              <p className="text-sm text-(--dht-gray)">Quality in every detail</p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100}>
            <div className="bg-white rounded-xl p-6 text-center hover:transform hover:-translate-y-2 transition-transform duration-300 shadow-lg">
              <div className="w-10 h-10 mx-auto mb-3 text-(--dht-red) flex items-center justify-center">
                <span className="text-2xl font-bold">S</span>
              </div>
              <h4 className="font-bold text-(--dht-dark) mb-2">Safety</h4>
              <p className="text-sm text-(--dht-gray)">Above all else</p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <div className="bg-white rounded-xl p-6 text-center hover:transform hover:-translate-y-2 transition-transform duration-300 shadow-lg">
              <div className="w-10 h-10 mx-auto mb-3 text-(--dht-red) flex items-center justify-center">
                <span className="text-2xl font-bold">I</span>
              </div>
              <h4 className="font-bold text-(--dht-dark) mb-2">Integrity</h4>
              <p className="text-sm text-(--dht-gray)">Transparent & honest</p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={300}>
            <div className="bg-white rounded-xl p-6 text-center hover:transform hover:-translate-y-2 transition-transform duration-300 shadow-lg">
              <div className="w-10 h-10 mx-auto mb-3 text-(--dht-red) flex items-center justify-center">
                <span className="text-2xl font-bold">C</span>
              </div>
              <h4 className="font-bold text-(--dht-dark) mb-2">Collaboration</h4>
              <p className="text-sm text-(--dht-gray)">Growing together</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
