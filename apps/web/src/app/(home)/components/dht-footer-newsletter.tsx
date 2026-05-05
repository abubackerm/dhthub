"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function NewsletterForm() {
    const [email, setEmail] = useState("");

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Subscribe:", email);
        setEmail("");
    };

    return (
        <form
            onSubmit={handleSubscribe}
            className="flex w-full md:w-auto gap-2"
        >
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 md:w-80 px-4 py-3 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-(--dht-red)"
                required
            />
            <button
                type="submit"
                className="px-6 py-3 bg-(--dht-red) hover:bg-(--dht-red-hover) text-white rounded transition-colors flex items-center gap-2"
            >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Subscribe</span>
            </button>
        </form>
    );
}
