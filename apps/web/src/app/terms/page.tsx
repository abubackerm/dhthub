import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms and Conditions | Dynamic Hub Trading",
    description: "Terms and Conditions for Dynamic Hub Trading - Read our terms of service and usage policies.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-(--dht-gray-light)">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-4xl font-bold text-(--dht-darker) mb-6">Terms and Conditions</h1>
                    <p className="text-gray-600 mb-8">Last updated: May 6, 2026</p>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">1. Introduction</h2>
                            <p className="text-gray-700">
                                Welcome to Dynamic Hub Company. By accessing and using this website, you agree to comply with and be bound by the following Terms and Conditions. If you do not agree, please refrain from using this website.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">2. Use of Website</h2>
                            <p className="text-gray-700 mb-4">
                                This website is intended to provide general information about our products, services, and procurement solutions.
                            </p>
                            <p className="text-gray-700">
                                You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others or restrict their use of the website.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">3. Products & Services Information</h2>
                            <p className="text-gray-700 mb-4">
                                All product descriptions, service details, and specifications provided on this website are for general informational purposes only.
                            </p>
                            <p className="text-gray-700">
                                Dynamic Hub Company reserves the right to modify, update, or discontinue any product or service without prior notice.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">4. Quotations & Pricing</h2>
                            <p className="text-gray-700 mb-4">
                                Any pricing, quotations, or proposals shared through this website or via communication channels are subject to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                                <li>Final confirmation based on project scope and requirements</li>
                                <li>Availability of materials and supplier conditions</li>
                                <li>Applicable taxes, duties, and logistics costs</li>
                            </ul>
                            <p className="text-gray-700 mt-4">
                                Formal quotations will be provided upon request and may have specific validity periods.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">5. Procurement & Supply</h2>
                            <p className="text-gray-700 mb-4">
                                Dynamic Hub Company acts as a supplier and procurement partner, sourcing materials and products from approved vendors and manufacturers.
                            </p>
                            <p className="text-gray-700">
                                While we ensure quality and compliance, final specifications and approvals remain subject to project requirements and client confirmation.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">6. Intellectual Property</h2>
                            <p className="text-gray-700 mb-4">
                                All content on this website, including text, graphics, logos, and images, is the property of Dynamic Hub Company or its licensors and is protected by applicable copyright and intellectual property laws.
                            </p>
                            <p className="text-gray-700">
                                Unauthorised use, reproduction, or distribution is strictly prohibited.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">7. Limitation of Liability</h2>
                            <p className="text-gray-700 mb-4">
                                Dynamic Hub Company shall not be held liable for any direct, indirect, or consequential damages arising from the use of this website or reliance on its content.
                            </p>
                            <p className="text-gray-700">
                                All information is provided "as is" without warranties of any kind, express or implied.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">8. External Links</h2>
                            <p className="text-gray-700">
                                This website may contain links to third-party websites for informational purposes. Dynamic Hub Company is not responsible for the content, accuracy, or practices of these external sites.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">9. Confidentiality</h2>
                            <p className="text-gray-700">
                                Any information submitted through forms or communication channels will be handled with reasonable confidentiality. However, users are advised not to share sensitive or proprietary information unless required and agreed upon.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">10. Compliance & Regulations</h2>
                            <p className="text-gray-700">
                                Dynamic Hub Company operates in accordance with applicable industry standards, safety regulations, and compliance requirements relevant to its sectors, including oil & gas, marine, and infrastructure projects.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">11. Changes to Terms</h2>
                            <p className="text-gray-700">
                                Dynamic Hub Company reserves the right to update or modify these Terms and Conditions at any time without prior notice. Continued use of the website constitutes acceptance of the updated terms.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">12. Governing Law</h2>
                            <p className="text-gray-700">
                                These Terms and Conditions shall be governed by and interpreted in accordance with the laws of the Kingdom of Saudi Arabia.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-(--dht-darker) mb-4">13. Contact Information</h2>
                            <p className="text-gray-700 mb-4">
                                For any questions regarding these Terms and Conditions, please contact:
                            </p>
                            <div className="text-gray-700">
                                <p>Email: info@dynamichub.com</p>
                                <p>Address: Eastern Province, Saudi Arabia</p>
                            </div>
                        </section>

                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-gray-600">
                                For more information about our privacy practices, please visit our{" "}
                                <Link href="/privacy-policy" className="text-(--dht-red) hover:underline">
                                    Privacy Policy
                                </Link>{" "}
                                and{" "}
                                <Link href="/cookie-policy" className="text-(--dht-red) hover:underline">
                                    Cookie Policy
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
