"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

interface ImageWithPlaceholderProps extends Omit<ImageProps, "onLoad"> {
  /**
   * If true, shows a blur-up placeholder while image loads
   * @default true
   */
  showBlur?: boolean;
  /**
   * Custom placeholder color (Tailwind class)
   * @default "bg-gray-200"
   */
  placeholderColor?: string;
}

/**
 * Image component with automatic loading state and optional blur-up effect
 * Wraps Next.js Image component with progressive loading
 */
export function ImageWithPlaceholder({
  src,
  alt,
  showBlur = true,
  placeholderColor = "bg-gray-200",
  className = "",
  ...props
}: ImageWithPlaceholderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Placeholder overlay */}
      {!isLoaded && showBlur && (
        <div
          className={`absolute inset-0 ${placeholderColor} animate-pulse rounded`}
          style={{ zIndex: 1 }}
        />
      )}

      {/* Actual image - apply className for sizing and object-fit */}
      <Image
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)} // Stop showing placeholder on error
        {...props}
      />
    </div>
  );
}
