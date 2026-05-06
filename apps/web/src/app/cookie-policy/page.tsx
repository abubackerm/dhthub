import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Cookie Policy | Dynamic Hub Trading",
    description: "Learn about how Dynamic Hub Trading uses cookies and similar technologies on our website.",
};

export default function CookiePolicyPage() {
    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-(--dht-navy-soft) rounded-lg shadow-sm p-8">
                    <h1 className="text-4xl font-bold text-white mb-6">Cookie Policy</h1>
                    <p className="text-gray-400 mb-8">Last updated: May 6, 2026</p>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">1. What Are Cookies</h2>
                            <p className="text-gray-300 mb-4">
                                Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Cookies</h2>
                            <p className="text-gray-300 mb-4">We use cookies for the following purposes:</p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li><strong>Essential Cookies:</strong> Required for the website to function properly, enabling you to navigate and use features like shopping cart and checkout.</li>
                                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website by collecting anonymous information about your visit.</li>
                                <li><strong>Functionality Cookies:</strong> Remember your choices (such as language or region) to provide enhanced, more personalized features.</li>
                                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and limit the number of times you see an advertisement.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">3. Types of Cookies We Use</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Session Cookies</h3>
                                    <p className="text-gray-300">
                                        These cookies are temporary and are deleted when you close your browser. They are essential for maintaining your session while you navigate our website.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Persistent Cookies</h3>
                                    <p className="text-gray-300">
                                        These cookies remain on your device for a set period or until you delete them. They remember your preferences for future visits.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Third-Party Cookies</h3>
                                    <p className="text-gray-300">
                                        Cookies placed by third-party services (such as analytics providers or advertising networks) that we use to enhance our website functionality.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">4. Managing Your Cookie Preferences</h2>
                            <p className="text-gray-300 mb-4">
                                You can control and manage cookies in various ways:
                            </p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, or receive notifications when a cookie is being sent.</li>
                                <li><strong>Cookie Consent Tool:</strong> Use our cookie consent banner to customize your preferences at any time.</li>
                                <li><strong>Clear Cookies:</strong> You can delete all cookies that are already on your device through your browser settings.</li>
                            </ul>
                            <p className="text-gray-300 mt-4">
                                Please note that blocking or deleting cookies may impact your experience on our website, and some features may not function properly.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Cookies</h2>
                            <p className="text-gray-300 mb-4">
                                We use third-party services that may place cookies on your device. These include:
                            </p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                                <li><strong>Google Analytics:</strong> For website analytics and understanding user behavior.</li>
                                <li><strong>Social Media Platforms:</strong> For social sharing functionality and embedded content.</li>
                                <li><strong>Payment Processors:</strong> For secure payment processing during checkout.</li>
                            </ul>
                            <p className="text-gray-300 mt-4">
                                These third parties have their own privacy and cookie policies, which we recommend you review.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">6. Updates to This Policy</h2>
                            <p className="text-gray-300">
                                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of any material changes by posting a notice on our website or sending you an email.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">7. Contact Us</h2>
                            <p className="text-gray-300 mb-4">
                                If you have any questions about our use of cookies, please contact us at:
                            </p>
                            <div className="text-gray-300">
                                <p>Email: info@dynamichub.com</p>
                                <p>Address: Eastern Province, Saudi Arabia</p>
                            </div>
                        </section>

                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-gray-400">
                                For more information about our privacy practices, please visit our{" "}
                                <Link href="/privacy-policy" className="text-(--dht-red) hover:underline">
                                    Privacy Policy
                                </Link>{" "}
                                and{" "}
                                <Link href="/terms" className="text-(--dht-red) hover:underline">
                                    Terms & Conditions
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
