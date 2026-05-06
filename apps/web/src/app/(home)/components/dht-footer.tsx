import Link from "next/link";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { NewsletterForm } from "./dht-footer-newsletter";

const footerLinks = {
    company: [
        { label: "About Us", href: "/about" },
        { label: "Products", href: "/products" },
        { label: "Contact Us", href: "/contact" },
        { label: "Dealer Portal", href: "/dealer-portal" },
    ],
    services: [
        { label: "General Maintenance", href: "/services/maintenance" },
        { label: "Facility Management", href: "/services/facility-management" },
        { label: "HVAC Services", href: "/services/hvac" },
        { label: "Procurement", href: "/services/procurement" },
    ],
};

const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
];

export function DHTFooter() {
    return (
        <footer className="bg-(--dht-darker)">
            {/* Supplying Infrastructure Banner */}
            <div className="relative py-16">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('/images/footer-industrial.jpg')",
                    }}
                >
                    <div className="absolute inset-0 bg-linear-to-r from-(--dht-red) to-(--dht-red)/80" />
                </div>
                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                        Supplying the Backbone of Modern Infrastructure.
                    </h2>
                </div>
            </div>

            {/* Newsletter Section */}
            <div className="border-b border-white/10 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                Subscribe Now
                            </h3>
                            <p className="text-gray-400">
                                Don&apos;t miss our future updates! Get Subscribed Today!
                            </p>
                        </div>
                        <NewsletterForm />
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Logo & Description */}
                        <div className="lg:col-span-1">
                            <Link href="/" className="flex items-center gap-2 mb-6">
                                <div className="w-10 h-10 bg-(--dht-red) rounded flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">DH</span>
                                </div>
                                <span className="text-white font-bold text-xl tracking-tight">
                                    DYNAMIC HUB
                                </span>
                            </Link>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                From Infrastructure to Offshore — We Deliver What Projects
                                Demand.
                            </p>
                            <div className="flex gap-4">
                                {socialLinks.map((social, index) => (
                                    <a
                                        key={index}
                                        href={social.href}
                                        className="w-10 h-10 bg-white/10 hover:bg-(--dht-red) rounded-full flex items-center justify-center transition-colors"
                                        aria-label={social.label}
                                    >
                                        <social.icon className="w-5 h-5 text-white" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Company Links */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Company</h4>
                            <ul className="space-y-3">
                                {footerLinks.company.map((link, index) => (
                                    <li key={index}>
                                        <Link
                                            href={link.href}
                                            className="text-gray-400 hover:text-(--dht-red) transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Services Links */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Services</h4>
                            <ul className="space-y-3">
                                {footerLinks.services.map((link, index) => (
                                    <li key={index}>
                                        <Link
                                            href={link.href}
                                            className="text-gray-400 hover:text-(--dht-red) transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact Info */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Contact Us</h4>
                            <ul className="space-y-3 text-gray-400 text-sm">
                                <li>Eastern Province, Saudi Arabia</li>
                                <li>
                                    <a
                                        href="mailto:info@dynamichub.com"
                                        className="hover:text-(--dht-red) transition-colors"
                                    >
                                        info@dynamichub.com
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="tel:+966123456789"
                                        className="hover:text-(--dht-red) transition-colors"
                                    >
                                        +966 12 345 6789
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-white/10 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        ©{new Date().getFullYear()} Dynamic Hub. All Rights Reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
