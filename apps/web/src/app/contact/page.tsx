import {
  Mail,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
import { ContactForm } from "./contact-form";
import { ScrollAnimationScript } from "@/components/scroll-animation-script";

export const metadata = {
  title: "Contact Us | Dynamic Hub Trading",
  description: "Get in touch with Dynamic Hub Trading for HVAC solutions, facilities management, and procurement services.",
};

export default function ContactPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-(--dht-dark)">
        <div className="absolute inset-0 bg-linear-to-br from-(--dht-dark) via-(--dht-darker) to-(--dht-dark)" />
        <div className="absolute inset-0 geometric-pattern opacity-[0.03]" />

        <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-transparent via-(--dht-red) to-transparent opacity-50" />
        <div className="absolute bottom-0 right-0 w-full h-1 bg-linear-to-r from-transparent via-(--dht-red) to-transparent opacity-50" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <p className="text-(--dht-red) font-semibold uppercase tracking-[0.3em] mb-6 text-sm md:text-base">
            Contact Us
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Let&apos;s Build Something
            <br />
            <span className="text-(--dht-red)">Together</span>
          </h1>
          <p className="text-(--dht-gray) text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Whether you need HVAC solutions, facilities management, or
            procurement services, our team is ready to deliver excellence.
          </p>
        </div>

        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-(--dht-red) rounded-full opacity-5 blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-(--dht-red) rounded-full opacity-5 blur-2xl" />
      </section>

      {/* Contact Form & Info Section */}
      <section className="relative py-24 bg-(--dht-dark)">
        <div className="absolute inset-0 bg-linear-to-b from-(--dht-dark) to-(--dht-darker)" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Contact Form - Client Island */}
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            {/* Contact Information - Server Rendered */}
            <div className="lg:col-span-2">
              <div className="space-y-8">
                {/* Info Cards */}
                <div className="space-y-4">
                  <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-(--dht-red)" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Location</h3>
                      <p className="text-(--dht-gray) text-sm leading-relaxed">
                        Eastern Province
                        <br />
                        Saudi Arabia
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-(--dht-red)" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Email</h3>
                      <a
                        href="mailto:info@dynamichub.sa"
                        className="text-(--dht-gray) hover:text-(--dht-red) text-sm transition-colors"
                      >
                        info@dynamichub.sa
                      </a>
                    </div>
                  </div>

                  <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-(--dht-red)" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Phone</h3>
                      <a
                        href="tel:+966130000000"
                        className="text-(--dht-gray) hover:text-(--dht-red) text-sm transition-colors"
                      >
                        +966 13 000 0000
                      </a>
                    </div>
                  </div>

                  <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-(--dht-red)/20 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-(--dht-red)" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        Business Hours
                      </h3>
                      <p className="text-(--dht-gray) text-sm leading-relaxed">
                        Sun - Thu: 8:00 AM - 5:00 PM
                        <br />
                        Fri - Sat: Closed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Map Placeholder */}
                <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <div className="aspect-4/3 bg-(--dht-darker) flex items-center justify-center">
                    <div className="text-center px-6">
                      <MapPin className="w-10 h-10 text-(--dht-red)/40 mx-auto mb-3" />
                      <p className="text-(--dht-gray) text-sm">
                        Eastern Province, Saudi Arabia
                      </p>
                      <a
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-(--dht-red) hover:text-(--dht-red-hover) text-sm font-medium transition-colors"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-(--dht-red) rounded-full opacity-5 blur-3xl" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-(--dht-red) rounded-full opacity-5 blur-3xl" />
      </section>

      <ScrollAnimationScript />
    </>
  );
}
