"use client";

import Link from "next/link";

export function DHTHero() {
    return (
        <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/images/hero-industrial.jpg')",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="max-w-2xl">
                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                        From Infrastructure to Offshore —
                        <br />
                        We Deliver What Projects Demand
                    </h1>
                    <p className="text-sm md:text-base text-gray-200 mb-6 leading-normal">
                        We deliver a diversified portfolio through our General Maintenance, Facility Management, HVAC Services, and Procurement & Sourcing divisions complemented by building and sanitary materials, and high-performance industrial solutions for oil & gas and marine offshore projects. We empower modern infrastructure with precision engineering, products, expert services, and seamless project support.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-block bg-[var(--dht-red)] hover:bg-[var(--dht-red-hover)] text-white font-semibold px-8 py-3 rounded transition-colors uppercase text-xs tracking-wide"
                    >
                        Contact Us
                    </Link>
                </div>
            </div>
        </section>
    );
}
