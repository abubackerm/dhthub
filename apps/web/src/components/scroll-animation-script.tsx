"use client";

import { useEffect } from "react";

export function ScrollAnimationScript() {
  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const triggers = document.querySelectorAll('.scroll-trigger');

        triggers.forEach((trigger) => {
          const rect = (trigger as HTMLElement).getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight * 0.85;

          if (isVisible && !(trigger as HTMLElement).classList.contains('animate-in')) {
            (trigger as HTMLElement).classList.add('animate-in');
            (trigger as HTMLElement).classList.remove('animate-out');
          }
        });
      });
    };

    // Initial check on load
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return null;
}
