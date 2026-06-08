import Link from "next/link";
import Image from "next/image";
import { HeroSlider } from "./dht-hero-slider";

export function DHTHero() {
    return (
        <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden">
            {/* Client-side sliding images + indicators */}
            <HeroSlider />

            {/* Logo Overlay - Top Right */}
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

            {/* Content - Static server-rendered */}
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
        </section>
    );
}
