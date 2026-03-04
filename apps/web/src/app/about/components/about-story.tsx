"use client";

import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Building2, Award, Globe } from "lucide-react";

export function AboutStory() {
  const { ref: imageRef, getAnimationClass: getImageClass } = useScrollAnimation({
    threshold: 0.3,
    animationType: "fade-left",
  });

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
          {/* Image Section - 60% width on desktop */}
          <div ref={imageRef as any} className="lg:col-span-3 relative">
            {/* Main Image */}
            <div
              className={`aspect-16/10 bg-cover bg-center rounded-2xl shadow-2xl overflow-hidden ${getImageClass()}`}
              style={{
                backgroundImage: "url('/images/about-building.jpg')",
              }}
            >
              {/* Red Overlay on Hover */}
              <div className="absolute inset-0 bg-(--dht-red) opacity-0 hover:opacity-10 transition-opacity duration-500" />
            </div>

            {/* Animated Border Accent */}
            <div className={`absolute -top-4 -left-4 w-full h-full border-2 border-(--dht-red) rounded-2xl -z-10 ${getImageClass()}`} />

            {/* Stats Badge */}
            <div className="absolute -bottom-8 -right-8 bg-(--dht-red) text-white p-6 rounded-xl shadow-2xl">
              <div className="text-4xl font-bold mb-1">15+</div>
              <div className="text-sm uppercase tracking-wider opacity-90">Years</div>
            </div>
          </div>

          {/* Content Section - 40% width on desktop */}
          <div className="lg:col-span-2 space-y-6 scroll-trigger">
            {/* Section Label */}
            <p className="text-(--dht-red) font-semibold uppercase tracking-wider text-sm">
              Our Story
            </p>

            {/* Heading */}
            <h2 className="text-3xl md:text-4xl font-bold text-(--dht-dark) leading-tight scroll-trigger">
              From Eastern Province to Global Excellence
            </h2>

            {/* Paragraphs */}
            <p className="text-(--dht-gray) leading-relaxed scroll-trigger">
              Founded over 15 years ago in Eastern Province of Kingdom of Saudi Arabia, Dynamic Hub
              has evolved into a trusted provider of HVAC air distribution, facilities management, maintenance,
              and procurement solutions for some of region's most demanding sectors.
            </p>

            <p className="text-(--dht-gray) leading-relaxed scroll-trigger">
              With a proven track record across Kingdom and strong global alliances, we deliver reliable,
              high-quality solutions that prioritize safety, extend asset life, and consistently meet stringent
              industry standards.
            </p>

            {/* Quote Highlight */}
            <div className="relative pl-6 border-l-4 border-(--dht-red) scroll-trigger">
              <p className="text-(--dht-dark) font-medium italic leading-relaxed">
                "As an approved vendor for Saudi Aramco, we operate under the highest safety protocols and quality
                controls—making us a dependable partner for high-stakes oil & gas, infrastructure, and marine
                environments."
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 scroll-trigger">
              <div className="text-center">
                <Building2 className="w-6 h-6 mx-auto mb-2 text-(--dht-red)" />
                <div className="text-2xl font-bold text-(--dht-dark)">500+</div>
                <div className="text-xs text-(--dht-gray) uppercase">Projects</div>
              </div>
              <div className="text-center">
                <Award className="w-6 h-6 mx-auto mb-2 text-(--dht-red)" />
                <div className="text-2xl font-bold text-(--dht-dark)">50+</div>
                <div className="text-xs text-(--dht-gray) uppercase">Clients</div>
              </div>
              <div className="text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-(--dht-red)" />
                <div className="text-2xl font-bold text-(--dht-dark)">5+</div>
                <div className="text-xs text-(--dht-gray) uppercase">Countries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
