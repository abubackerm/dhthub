"use client";

import { useEffect, useRef, useState } from "react";

export type AnimationType =
  | "fade-up"
  | "fade-left"
  | "fade-right"
  | "scale-up"
  | "stagger-up";

interface UseScrollAnimationProps {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  animationType?: AnimationType;
  delay?: number;
}

export function useScrollAnimation({
  threshold = 0.1,
  rootMargin = "0px",
  triggerOnce = true,
  animationType = "fade-up",
  delay = 0,
}: UseScrollAnimationProps = {}) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);

          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce, delay]);

  const getAnimationClass = () => {
    const baseClass = "scroll-animate";
    const typeClass = `scroll-animate-${animationType}`;
    const stateClass = isVisible ? "animate-in" : "animate-out";
    return `${baseClass} ${typeClass} ${stateClass}`;
  };

  return { ref, isVisible, getAnimationClass };
}

export function useCounterAnimation(
  target: number,
  duration: number = 2000,
  threshold: number = 0.5
) {
  const ref = useRef<HTMLElement>(null);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          let startTime: number;
          let animationFrame: number;

          const animate = (currentTime: number) => {
            startTime = startTime || currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(target * easedProgress));

            if (progress < 1) {
              animationFrame = requestAnimationFrame(animate);
            }
          };

          animationFrame = requestAnimationFrame(animate);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [target, duration, threshold, hasAnimated]);

  return { ref, count };
}

export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -speed;
      element.style.transform = `translateY(${rate}px)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [speed]);

  return ref;
}
