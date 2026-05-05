import { Card } from "@/components/ui/card";

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
                <h2 className="text-2xl md:text-3xl font-bold text-(--dht-dark) text-center mb-12">
                    Our Clients
                </h2>

                <div className="relative">
                    {/* Left Fade */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-white to-transparent z-10 pointer-events-none" />

                    {/* Right Fade */}
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-white to-transparent z-10 pointer-events-none" />

                    {/* Logo Container */}
                    <div className="overflow-hidden">
                        <div className="flex animate-clients-scroll space-x-8 sm:space-x-12">
                            {/* First set of clients */}
                            {clients.map((client, index) => (
                                <Card
                                    key={`first-${index}`}
                                    className="shrink-0 flex flex-col items-center justify-center h-20 w-36 border-0 shadow-none bg-transparent"
                                >
                                    <div
                                        className="w-24 h-12 bg-gray-100 hover:bg-(--dht-red) rounded-lg flex items-center justify-center transition-colors"
                                        title={client.name}
                                    >
                                        <span className="text-xl font-bold text-gray-400 hover:text-white transition-colors">
                                            {client.initials}
                                        </span>
                                    </div>
                                    <p className="text-center text-xs text-gray-500 mt-2 whitespace-nowrap">
                                        {client.name}
                                    </p>
                                </Card>
                            ))}

                            {/* Second set for seamless loop */}
                            {clients.map((client, index) => (
                                <Card
                                    key={`second-${index}`}
                                    className="shrink-0 flex flex-col items-center justify-center h-20 w-36 border-0 shadow-none bg-transparent"
                                >
                                    <div
                                        className="w-24 h-12 bg-gray-100 hover:bg-(--dht-red) rounded-lg flex items-center justify-center transition-colors"
                                        title={client.name}
                                    >
                                        <span className="text-xl font-bold text-gray-400 hover:text-white transition-colors">
                                            {client.initials}
                                        </span>
                                    </div>
                                    <p className="text-center text-xs text-gray-500 mt-2 whitespace-nowrap">
                                        {client.name}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
