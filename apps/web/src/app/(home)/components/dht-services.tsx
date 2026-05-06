const services = [
    {
        title: "General Maintenance",
        description:
            "Comprehensive building, civil, plumbing, painting, and structural maintenance delivered through preventive and reactive solutions to ensure long-term asset reliability.",
    },
    {
        title: "Facility Management",
        description:
            "Integrated facility management services covering cleaning, housekeeping, inspections, and rapid issue resolution to keep operations safe, hygienic, and fully functional.",
    },
    {
        title: "HVAC Services",
        description:
            "Professional HVAC installation, maintenance, repairs, and system optimization to improve energy efficiency, indoor air quality, and regulatory compliance.",
    },
];

export function DHTServices() {
    return (
        <section className="py-32 bg-(--dht-navy) overflow-visible">
            <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
                    {/* Left side: Heading - Pushed left */}
                    <div className="lg:w-[20%] text-left pt-12">
                        <h2 className="text-(--dht-red) font-bold text-xl uppercase tracking-[0.2em] mb-4">
                            OUR SERVICES
                        </h2>
                        <p className="text-gray-500 text-[13px] leading-relaxed">
                            We deliver end-to-end service solutions designed to ensure
                            operational continuity, safety, and long-term asset performance
                            across commercial, industrial, and specialized environments.
                        </p>
                    </div>

                    {/* Right side: Image and Overlapping White Box - Pushed right */}
                    <div className="lg:w-[75%] relative">
                        {/* The Image - Scaled bigger */}
                        <div className="relative w-full aspect-16/7 overflow-hidden rounded-sm">
                            <div
                                className="w-full h-full bg-cover bg-center"
                                style={{
                                    backgroundImage: "url('/images/services-worker.jpg')",
                                }}
                            />
                        </div>

                        {/* Overlapping White Box - Also moved right with the container */}
                        <div className="lg:absolute lg:right-0 lg:bottom-[-80px] w-full lg:w-[95%] bg-(--dht-card-bg) border border-gray-100 shadow-[0_30px_60px_rgba(0,0,0,0.1)]">
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                {services.map((service, index) => (
                                    <div
                                        key={index}
                                        className="p-10 lg:p-12 min-h-[240px] flex flex-col justify-center"
                                    >
                                        <h3 className="text-white font-bold text-lg mb-4">
                                            {service.title}
                                        </h3>
                                        <p className="text-gray-400 text-[12px] leading-relaxed">
                                            {service.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Spacer for the overlapping absolute element on desktop */}
            <div className="hidden lg:block h-24" />
        </section>
    );
}

