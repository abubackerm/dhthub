"use client";

import { useEffect, useState, useRef } from "react";

interface StatCounterProps {
    value: number;
    suffix: string;
    label: string;
    decimals?: number;
}

export function StatCounter({ value, suffix, label, decimals = 0 }: StatCounterProps) {
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
        const duration = 2000;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(progress * value);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }, [hasStarted, value]);

    return (
        <div ref={ref} className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}
                {suffix}
            </div>
            <div className="text-white/80 text-sm md:text-base">
                {label}
            </div>
        </div>
    );
}
