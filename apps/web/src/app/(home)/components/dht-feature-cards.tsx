import { Settings, Boxes, ShieldCheck } from "lucide-react";

const features = [
    {
        icon: Settings,
        title: "Multi-Sector Expertise",
        description:
            "Empowering infrastructure, oil & gas, and offshore success through expert maintenance, facility management, HVAC services, and strategic sourcing.",
    },
    {
        icon: Boxes,
        title: "Project-Driven Supply",
        description:
            "From standard materials to complex project sourcing—we deliver precision-aligned solutions that meet technical specifications, timelines, and compliance standards.",
    },
    {
        icon: ShieldCheck,
        title: "Quality, Compliance & Reliability",
        description:
            "Products sourced and supplied in line with international standards, durability, performance, and operational safety.",
    },
];

export function DHTFeatureCards() {
    return (
        <section className="relative -mt-24 z-20 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-[var(--dht-red)] p-8 rounded-lg shadow-xl hover:shadow-2xl transition-shadow"
                        >
                            <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                                <feature.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">
                                {feature.title}
                            </h3>
                            <p className="text-white/90 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
