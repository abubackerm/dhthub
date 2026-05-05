import Link from "next/link";

export function DHTDealerCTA() {
    return (
        <section className="bg-[var(--dht-dark)] py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <p className="text-[var(--dht-red)] font-semibold uppercase tracking-wider mb-4">
                    Partnership Opportunity
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    BECOME A DEALER
                </h2>
                <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                    As a Dynamic Hub dealer, you gain access to a high-demand,
                    multi-sector product range backed by reliable supply, competitive
                    pricing, and technical support. Our partnership model is built for
                    long-term growth, consistent margins, and project-driven
                    opportunities.
                </p>
                <Link
                    href="/dealer-portal"
                    className="inline-block bg-[var(--dht-red)] hover:bg-[var(--dht-red-hover)] text-white font-semibold px-8 py-4 rounded transition-colors"
                >
                    Dealer Portal
                </Link>
            </div>
        </section>
    );
}
