"use client";

import { useEffect, useState, useRef } from "react";

const stats = [
    { value: 15, suffix: "+", label: "Years of Industry Expertise" },
    { value: 1.5, suffix: " mil+", label: "Products Supplied", decimals: 1 },
    { value: 100, suffix: "+", label: "Projects Completed" },
    { value: 5, suffix: "+", label: "Locations/Service Centers" },
];

function useCountUp(target: number, duration: number = 2000, decimals: number = 0) {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasStarted) {
                    setHasStarted(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;

        let startTime: number;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(progress * target);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }, [hasStarted, target, duration]);

    return { count: decimals > 0 ? count.toFixed(decimals) : Math.floor(count), ref };
}

export function DHTStats() {
    return (
        <section className="bg-[var(--dht-red)] py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, index) => {
                        const { count, ref } = useCountUp(stat.value, 2000, stat.decimals || 0);
                        return (
                            <div key={index} ref={ref} className="text-center">
                                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                                    {count}
                                    {stat.suffix}
                                </div>
                                <div className="text-white/80 text-sm md:text-base">
                                    {stat.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
