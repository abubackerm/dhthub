import { StatCounter } from "./dht-stats-counter";

const stats = [
    { value: 15, suffix: "+", label: "Years of Industry Expertise" },
    { value: 1.5, suffix: " mil+", label: "Products Supplied", decimals: 1 },
    { value: 100, suffix: "+", label: "Projects Completed" },
    { value: 5, suffix: "+", label: "Locations/Service Centers" },
];

export function DHTStats() {
    return (
        <section className="bg-[var(--dht-red)] py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <StatCounter
                            key={index}
                            value={stat.value}
                            suffix={stat.suffix}
                            label={stat.label}
                            decimals={stat.decimals || 0}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
