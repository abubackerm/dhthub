"use client";

export function DHTExpertiseBanner() {
    return (
        <section className="relative py-24">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/images/expertise-industrial.jpg')",
                }}
            >
                <div className="absolute inset-0 bg-black/60" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                    Expertise That Delivers Across Industries.
                </h2>
                <p className="text-lg text-gray-200 max-w-2xl mx-auto">
                    Dynamic Hub Company combines multi-sector expertise with reliable
                    supply capabilities to support projects ranging from commercial
                    buildings to complex industrial and offshore developments.
                </p>
            </div>
        </section>
    );
}
