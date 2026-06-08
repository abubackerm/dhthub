import { Award, CheckCircle, Shield, Star } from "lucide-react";

const certifications = [
  {
    name: "Saudi Aramco Approved Vendor",
    icon: Award,
    color: "text-(--dht-red)",
  },
  {
    name: "ISO 9001:2015 Quality Management",
    icon: Shield,
    color: "text-(--dht-red)",
  },
  {
    name: "ISO 45001:2018 Occupational Health",
    icon: CheckCircle,
    color: "text-(--dht-red)",
  },
  {
    name: "ISO 14001:2015 Environmental",
    icon: Star,
    color: "text-(--dht-red)",
  },
];

const industries = [
  "Oil & Gas",
  "Power Generation",
  "Petrochemical",
  "Marine & Offshore",
  "Commercial Buildings",
  "Industrial Facilities",
];

export function AboutCertifications() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-[0.02]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="scroll-trigger text-center mb-16">
          <p className="text-(--dht-red) font-semibold uppercase tracking-wider mb-3 text-sm">
            Our Credentials
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-(--dht-dark) mb-4">
            Certifications & Industries
          </h2>
          <p className="text-(--dht-gray) max-w-2xl mx-auto">
            Maintaining highest industry standards and serving diverse sectors.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Certifications */}
          <div>
            <h3 className="text-2xl font-bold text-(--dht-dark) mb-8 scroll-trigger">
              Certified Excellence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 scroll-trigger">
              {certifications.map((cert, index) => {
                const Icon = cert.icon;
                const delayClass = `animate-float-delay-${(index % 4) + 1}` as "animate-float-delay-1" | "animate-float-delay-2" | "animate-float-delay-3" | "animate-float-delay-4";
                return (
                  <div
                    key={index}
                    className={`scroll-trigger bg-(--dht-gray-light) rounded-xl p-6 hover:shadow-lg transition-shadow duration-300 animate-float ${delayClass}`}
                  >
                    <Icon className={`w-8 h-8 ${cert.color} mb-4`} />
                    <p className="text-(--dht-dark) font-medium leading-snug">
                      {cert.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-2xl font-bold text-(--dht-dark) mb-8 scroll-trigger">
              Industries We Serve
            </h3>
            <div className="bg-(--dht-gray-light) rounded-2xl p-8 scroll-trigger">
              <div className="grid grid-cols-2 gap-4 scroll-trigger">
                {industries.map((industry, index) => (
                  <div
                    key={index}
                    className="scroll-trigger flex items-center gap-3"
                  >
                    <div className="w-2 h-2 bg-(--dht-red) rounded-full shrink-0" />
                    <span className="text-(--dht-dark) font-medium">{industry}</span>
                  </div>
                ))}
              </div>

              {/* Saudi Aramco Highlight */}
              <div className="mt-8 pt-8 border-t border-(--dht-red)/20 scroll-trigger">
                <div className="bg-(--dht-dark) rounded-xl p-6 flex items-start gap-4">
                  <Award className="w-10 h-10 text-(--dht-red) shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white font-bold mb-2">Saudi Aramco Approved</h4>
                    <p className="text-(--dht-gray) text-sm leading-relaxed">
                      We are proud to be an approved vendor for Saudi Aramco, operating under
                      highest safety protocols, quality controls, and regulatory requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-16 text-center scroll-trigger">
          <div className="inline-flex items-center gap-3 bg-(--dht-red)/10 border-2 border-(--dht-red) rounded-full px-8 py-4">
            <Shield className="w-6 h-6 text-(--dht-red)" />
            <span className="text-(--dht-red) font-semibold uppercase tracking-wider">
              Trusted by Industry Leaders
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
