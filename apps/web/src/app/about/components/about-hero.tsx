"use client";

import { useScrollAnimation, useParallax } from "@/hooks/use-scroll-animation";
import { ChevronDown } from "lucide-react";

export function AboutHero() {
  const { ref: titleRef, isVisible: titleVisible, getAnimationClass: getTitleClass } = useScrollAnimation({
    threshold: 0.2,
  });

  const subtitleRef = useParallax(0.3);
  const patternRef = useParallax(0.15);

  // Split text into letters for animation
  const animateText = (text: string) => {
    return text.split('').map((char, index) => (
      <span key={index} style={{ animationDelay: `${index * 50}ms` }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-(--dht-dark)">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-linear-to-br from-(--dht-dark) via-(--dht-darker) to-(--dht-dark) animate-gradient" />

      {/* Geometric Pattern Overlay */}
      <div ref={patternRef as React.RefObject<HTMLDivElement>} className="absolute inset-0 geometric-pattern" />

      {/* Red Accent Lines */}
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-transparent via-(--dht-red) to-transparent opacity-50" />
      <div className="absolute bottom-0 right-0 w-full h-1 bg-linear-to-r from-transparent via-(--dht-red) to-transparent opacity-50" />
      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Pre-label */}
        <p className="text-(--dht-red) font-semibold uppercase tracking-[0.3em] mb-6 text-sm md:text-base animate-in fade-in slide-in-from-top duration-700 delay-300">
          About Dynamic Hub
        </p>

        {/* Animated Headline */}
        <h1
          ref={titleRef as any}
          className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight ${titleVisible ? 'letter-reveal animate-in' : ''}`}
        >
          {titleVisible && (
            <>
              {animateText("Built on Experience.")}
              <br />
              {animateText("Trusted Critically.")}
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef as React.RefObject<HTMLParagraphElement>}
          className="text-(--dht-gray) text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
        >
          15+ years of excellence serving industrial, commercial, and offshore sectors
          across Saudi Arabia and beyond.
        </p>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-down">
          <ChevronDown className="w-8 h-8 text-(--dht-red)" />
        </div>
      </div>

      {/* Decorative Red Circle */}
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-(--dht-red) rounded-full opacity-5 blur-3xl" />
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-(--dht-red) rounded-full opacity-5 blur-2xl" />
    </section>
  );
}
