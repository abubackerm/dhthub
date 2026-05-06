export function DHTAbout() {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Image */}
                    <div className="relative">
                        <div
                            className="aspect-4/3 bg-cover bg-center rounded-lg shadow-xl"
                            style={{
                                backgroundImage: "url('/images/about-building.jpg')",
                            }}
                        />
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[var(--dht-red)] rounded-lg hidden lg:block" />
                    </div>

                    {/* Content */}
                    <div>
                        <h5 className="text-[var(--dht-red)] font-semibold uppercase tracking-wider mb-3">
                            Built on Experience. Trusted Across Critical Industries.
                        </h5>
                        <p className="text-[var(--dht-gray)] leading-relaxed mb-6">
                            Founded over 15 years ago in the Eastern Province of the Kingdom
                            of Saudi Arabia, Dynamic Hub has evolved into a trusted provider
                            of HVAC air distribution, facilities management, maintenance, and
                            procurement solutions for some of the region&apos;s most demanding
                            sectors.
                        </p>
                        <p className="text-[var(--dht-gray)] leading-relaxed mb-6">
                            With a proven track record across the Kingdom and strong global
                            alliances, we deliver reliable, high-quality solutions that
                            prioritize safety, extend asset life, and consistently meet
                            stringent industry standards. Our certified professionals support
                            industrial, commercial, marine, offshore, and residential projects
                            across Saudi Arabia and beyond.
                        </p>
                        <p className="text-[var(--dht-gray)] leading-relaxed">
                            As an approved vendor for Saudi Aramco, we operate under the
                            highest safety protocols, quality controls, and regulatory
                            requirements—making Dynamic Hub a dependable partner for
                            high-stakes oil & gas, infrastructure, and marine environments.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
