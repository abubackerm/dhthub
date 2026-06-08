"use client";

import { useEffect, useRef, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: "fade-up" | "fade-left" | "fade-right" | "scale-up";
  delay?: number;
  threshold?: number;
  className?: string;
  as?: "div" | "section" | "p" | "h1" | "h2" | "h3";
}

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  threshold = 0.1,
  className = "",
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add("animate-in");
            el.classList.remove("animate-out");
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <Tag
      ref={ref as any}
      className={`scroll-animate scroll-animate-${animation} animate-out ${className}`}
    >
      {children}
    </Tag>
  );
}
