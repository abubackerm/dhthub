"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

const slides = [
    { src: "/images/dht-banner-1.png", alt: "DHT Banner 1" },
    { src: "/images/dht-banner-2.png", alt: "DHT Banner 2" },
    { src: "/images/dht-banner-3.png", alt: "DHT Banner 3" },
];

export function HeroSlider() {
    const [current, setCurrent] = useState(0);

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
    }, []);

    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [next]);

    return (
        <>
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
        </>
    );
}
