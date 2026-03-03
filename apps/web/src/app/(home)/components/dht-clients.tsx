"use client";

const clients = [
    { name: "Troyani Suites", initials: "TS" },
    { name: "HP", initials: "HP" },
    { name: "Saudi Aramco", initials: "SA" },
    { name: "SABIC", initials: "SC" },
];

export function DHTClients() {
    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--dht-dark)] text-center mb-12">
                    Our Clients
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                    {clients.map((client, index) => (
                        <div
                            key={index}
                            className="group cursor-pointer transition-all"
                        >
                            <div
                                className="w-32 h-16 bg-gray-100 group-hover:bg-[var(--dht-red)] rounded-lg flex items-center justify-center transition-colors"
                                title={client.name}
                            >
                                <span className="text-2xl font-bold text-gray-400 group-hover:text-white transition-colors">
                                    {client.initials}
                                </span>
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-2">{client.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
