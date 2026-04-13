"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const slides = [
    { src: "/images/dht-banner-1.png", alt: "DHT Banner 1" },
    { src: "/images/dht-banner-2.png", alt: "DHT Banner 2" },
    { src: "/images/dht-banner-3.png", alt: "DHT Banner 3" },
];

export function DHTHero() {
    const [current, setCurrent] = useState(0);

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
    }, []);

    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [next]);

    return (
        <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden">
            {/* Sliding Background Images */}
            <div className="absolute inset-0">
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                        style={{
                            opacity: index === current ? 1 : 0,
                            zIndex: index === current ? 1 : 0,
                        }}
                    >
                        <Image
                            src={slide.src}
                            alt={slide.alt}
                            fill
                            className="object-cover object-center"
                            priority={index === 0}
                        />
                    </div>
                ))}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/50 to-transparent z-[2]" />
            </div>

            {/* Logo Overlay - Top Left */}
            <div className="absolute top-6 right-6 z-20">
                <Image
                    src="/images/dht-banner-logo.png"
                    alt="Dynamic Hub Trading"
                    width={380}
                    height={160}
                    className="object-contain drop-shadow-lg"
                    priority
                />
            </div>

            {/* Content - Right Aligned */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
                <div className="mr-auto max-w-2xl text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                        From Infrastructure to Offshore —
                        <br />
                        We Deliver What Projects Demand
                    </h1>
                    <p className="text-sm md:text-base text-gray-200 mb-6 leading-normal">
                        We deliver a diversified portfolio through our General
                        Maintenance, Facility Management, HVAC Services, and
                        Procurement &amp; Sourcing divisions complemented by
                        building and sanitary materials, and high-performance
                        industrial solutions for oil &amp; gas and marine offshore
                        projects. We empower modern infrastructure with precision
                        engineering, products, expert services, and seamless
                        project support.
                    </p>
                    <Link
                        href="/products"
                        className="inline-block bg-(--dht-red) hover:bg-(--dht-red-hover) text-white font-semibold px-8 py-3 rounded transition-colors uppercase text-xs tracking-wide"
                    >
                        Products
                    </Link>
                </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrent(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === current
                                ? "bg-white scale-110"
                                : "bg-white/40 hover:bg-white/60"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
