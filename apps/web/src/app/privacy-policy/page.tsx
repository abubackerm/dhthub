import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy | Dynamic Hub Trading",
    description: "Privacy Policy for Dynamic Hub Trading - Learn how we collect, use, and safeguard your personal information.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-(--dht-navy-soft) rounded-lg shadow-sm p-8">
                    <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>
                    <p className="text-gray-400 mb-8">Last updated: May 6, 2026</p>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                            <p className="text-gray-300">
                                Dynamic Hub Company ("we," "our," or "us") is committed to protecting your privacy and ensuring that your personal information is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and safeguard information when you visit our website or interact with our services.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
                            <h3 className="text-xl font-semibold text-white mb-3">a. Personal Information</h3>
                            <p className="text-gray-300 mb-4">
                                We may collect personal information that you voluntarily provide, including:
                            </p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li>Name</li>
                                <li>Company name</li>
                                <li>Email address</li>
                                <li>Phone number</li>
                                <li>Project or enquiry details</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mb-3 mt-6">b. Non-Personal Information</h3>
                            <p className="text-gray-300 mb-4">
                                We may automatically collect certain technical information such as:
                            </p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li>IP address</li>
                                <li>Browser type and device information</li>
                                <li>Website usage data and analytics</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                            <p className="text-gray-300 mb-4">We use the collected information to:</p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li>Respond to enquiries and provide quotations</li>
                                <li>Process requests for services, procurement, or partnerships</li>
                                <li>Improve our website, services, and user experience</li>
                                <li>Communicate updates, proposals, or relevant business information</li>
                                <li>Ensure compliance with legal and regulatory requirements</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">4. Information Sharing</h2>
                            <p className="text-gray-300 mb-4">
                                Dynamic Hub Company does not sell, rent, or trade your personal information. We may share information only in the following cases:
                            </p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li>With trusted suppliers or partners for project execution or procurement</li>
                                <li>When required by law, regulation, or legal process</li>
                                <li>To protect our rights, safety, or property</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
                            <p className="text-gray-300">
                                We implement appropriate technical and organizational measures to protect your information from unauthorized access, disclosure, alteration, or destruction. However, no online transmission or storage system can be guaranteed as 100% secure.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">6. Cookies & Tracking Technologies</h2>
                            <p className="text-gray-300">
                                Our website may use cookies and similar technologies to enhance user experience, analyze website traffic, and improve performance. Users may choose to disable cookies through their browser settings. For more details, please see our{" "}
                                <Link href="/cookie-policy" className="text-(--dht-red) hover:underline">
                                    Cookie Policy
                                </Link>
                                .
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Links</h2>
                            <p className="text-gray-300">
                                Our website may contain links to external websites. We are not responsible for the privacy practices or content of such third-party sites.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">8. Data Retention</h2>
                            <p className="text-gray-300">
                                We retain personal information only for as long as necessary to fulfill the purposes outlined in this policy or as required by applicable laws and regulations.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">9. Your Rights</h2>
                            <p className="text-gray-300 mb-4">Depending on applicable laws, you may have the right to:</p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li>Request access to your personal data</li>
                                <li>Request correction or deletion of your data</li>
                                <li>Withdraw consent for data usage (where applicable)</li>
                            </ul>
                            <p className="text-gray-300 mt-4">
                                Requests can be made by contacting us directly.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">10. Compliance with Regulations</h2>
                            <p className="text-gray-300">
                                Dynamic Hub Company operates in accordance with applicable data protection laws and industry standards, including relevant regulations within the Kingdom of Saudi Arabia.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">11. Updates to This Policy</h2>
                            <p className="text-gray-300">
                                We may update this Privacy Policy from time to time. Any changes will be posted on this page, and continued use of the website constitutes acceptance of such updates.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">12. Contact Information</h2>
                            <p className="text-gray-300 mb-4">
                                For any questions regarding this Privacy Policy or your data, please contact:
                            </p>
                            <div className="text-gray-300">
                                <p>Email: info@dynamichub.com</p>
                                <p>Address: Eastern Province, Saudi Arabia</p>
                            </div>
                        </section>

                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-gray-400">
                                For more information about our terms of service, please visit our{" "}
                                <Link href="/terms" className="text-(--dht-red) hover:underline">
                                    Terms & Conditions
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
