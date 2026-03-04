"use client";

import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

export function AboutCta() {
  const { ref: sectionRef, getAnimationClass: getSectionClass } = useScrollAnimation({
    threshold: 0.3,
    animationType: "fade-up",
  });

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className={`relative py-24 overflow-hidden ${getSectionClass()}`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-(--dht-dark)" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-(--dht-dark) via-(--dht-darker) to-(--dht-red)/20" />

      {/* Geometric Pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-[0.03]" />

      {/* Red Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-(--dht-red) to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Label */}
          <p className="text-(--dht-red) font-semibold uppercase tracking-wider mb-6 text-sm">
            Let's Work Together
          </p>

          {/* Heading */}
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Ready to Experience Dynamic Hub Difference?
          </h2>

          {/* Description */}
          <p className="text-(--dht-gray) text-lg mb-12 leading-relaxed">
            Whether you need HVAC solutions, facilities management, or procurement services,
            our team is ready to deliver excellence.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="mailto:info@dynamichub.sa"
              className="inline-flex items-center justify-center gap-2 bg-(--dht-red) text-white px-8 py-4 rounded-lg font-semibold hover:bg-(--dht-red-hover) transition-all duration-300 hover:shadow-2xl hover:shadow-(--dht-red)/30"
            >
              <Mail className="w-5 h-5" />
              Get in Touch
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="tel:+966130000000"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              <Phone className="w-5 h-5" />
              Call Us
            </a>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-(--dht-red)" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">Location</p>
                <p className="text-(--dht-gray) text-sm">Eastern Province, KSA</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-(--dht-red)" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">Phone</p>
                <p className="text-(--dht-gray) text-sm">+966 13 000 0000</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-(--dht-red)" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">Email</p>
                <p className="text-(--dht-gray) text-sm">info@dynamichub.sa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Circles */}
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-(--dht-red) rounded-full opacity-5 blur-3xl" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-(--dht-red) rounded-full opacity-5 blur-3xl" />
    </section>
  );
}
