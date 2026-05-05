import Link from "next/link";
import {
    Building,
    Anchor,
    Fuel,
    UtensilsCrossed,
    FileText,
    Flame,
} from "lucide-react";

const procurementItems = [
    {
        icon: Building,
        title: "Building & Sanitary Materials",
        description:
            "Sourcing project-grade construction materials, sanitary ware, plumbing systems, and fittings suitable for residential, commercial, and industrial developments.",
    },
    {
        icon: Anchor,
        title: "Marine & Offshore Projects",
        description:
            "Supplying offshore-rated materials, equipment, and components engineered for durability, corrosion resistance, and performance in marine environments.",
    },
    {
        icon: Fuel,
        title: "Oil & Gas Solutions",
        description:
            "Providing industrial-grade materials and components compliant with stringent safety, quality, and operational standards for refineries and energy infrastructure.",
    },
    {
        icon: UtensilsCrossed,
        title: "Food Provisions",
        description:
            "Reliable supply of packaged food provisions and consumables to support camps, offshore facilities, and remote site operations.",
    },
    {
        icon: FileText,
        title: "Office Supplies",
        description:
            "Procurement of essential office materials, consumables, and equipment to support daily business and site operations.",
    },
    {
        icon: Flame,
        title: "Refractory Materials",
        description:
            "Sourcing high-temperature refractory materials designed for furnaces, kilns, and industrial applications requiring thermal resistance and durability.",
    },
];

export function DHTProcurement() {
    return (
        <section className="relative py-20">
            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/images/procurement-containers.jpg')",
                }}
            >
                <div className="absolute inset-0 bg-white/95" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <h5 className="text-[var(--dht-red)] font-semibold uppercase tracking-wider mb-3">
                        PROCUREMENT
                    </h5>
                    <p className="text-[var(--dht-gray)] max-w-2xl">
                        We deliver reliable, end-to-end procurement solutions designed to
                        support operational continuity and project execution across multiple
                        sectors.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {procurementItems.map((item, index) => (
                        <Link
                            key={index}
                            href="#"
                            className="group bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-[var(--dht-red)]"
                        >
                            <div className="w-12 h-12 bg-[var(--dht-gray-light)] group-hover:bg-[var(--dht-red)] rounded-lg flex items-center justify-center mb-4 transition-colors">
                                <item.icon className="w-6 h-6 text-[var(--dht-red)] group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--dht-dark)] mb-2 group-hover:text-[var(--dht-red)] transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-sm text-[var(--dht-gray)] leading-relaxed">
                                {item.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
