"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const services = [
  "General Maintenance",
  "Facility Management",
  "HVAC Services",
  "Procurement & Sourcing",
  "Other",
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  recaptchaToken: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  general?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[+]?[\d\s()-]{7,20}$/.test(phone);
}

function loadReCAPTCHA(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).grecaptcha
    ) {
      resolve();
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=reCAPTCHALoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);

    (window as unknown as Record<string, () => void>).reCAPTCHALoaded = () =>
      resolve();
  });
}

export function ContactForm() {
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(
    null
  );

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    recaptchaToken: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || !recaptchaRef.current) return;

    loadReCAPTCHA().then(() => {
      const grecaptcha = (window as unknown as Record<string, unknown>)
        .grecaptcha as {
        render: (
          el: HTMLElement,
          opts: {
            sitekey: string;
            callback: (token: string) => void;
            "expired-callback": () => void;
            theme: string;
          }
        ) => number;
        reset: (id: number) => void;
      };

      if (grecaptcha && recaptchaRef.current) {
        const widgetId = grecaptcha.render(recaptchaRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            setFormData((prev) => ({ ...prev, recaptchaToken: token }));
            setErrors((prev) => ({ ...prev, general: undefined }));
          },
          "expired-callback": () => {
            setFormData((prev) => ({ ...prev, recaptchaToken: "" }));
          },
          theme: "dark",
        });
        setRecaptchaWidgetId(widgetId);
      }
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setStatus("loading");

    try {
      const body: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      };

      if (formData.phone.trim()) {
        body.phone = formData.phone.trim();
      }
      if (formData.service) {
        body.service = formData.service;
      }
      if (formData.recaptchaToken) {
        body.recaptchaToken = formData.recaptchaToken;
      }

      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message || "Failed to send message"
        );
      }

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        service: "",
        message: "",
        recaptchaToken: "",
      });

      const grecaptcha = (window as unknown as Record<string, unknown>)
        .grecaptcha as { reset?: (id: number) => void } | undefined;
      if (grecaptcha?.reset && recaptchaWidgetId !== null) {
        grecaptcha.reset(recaptchaWidgetId);
      }
    } catch (err) {
      setStatus("error");
      setErrors({
        general:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
        Send Us a Message
      </h2>
      <p className="text-(--dht-gray) mb-8">
        Fill out the form below and we&apos;ll get back to you within 24
        hours.
      </p>

      {status === "success" ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-(--dht-green)/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-(--dht-green)" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Message Sent!
          </h3>
          <p className="text-(--dht-gray) mb-6 max-w-sm">
            Thank you for reaching out. We&apos;ll review your message and
            get back to you shortly.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-(--dht-red) hover:text-(--dht-red-hover) font-medium transition-colors"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {errors.general && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Name <span className="text-(--dht-red)">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                errors.name
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-(--dht-red)"
              } text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                errors.name
                  ? "focus:ring-red-500/50"
                  : "focus:ring-(--dht-red)/50"
              } transition-colors`}
            />
            {errors.name && (
              <p className="mt-1.5 text-red-400 text-xs">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email <span className="text-(--dht-red)">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                errors.email
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-(--dht-red)"
              } text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                errors.email
                  ? "focus:ring-red-500/50"
                  : "focus:ring-(--dht-red)/50"
              } transition-colors`}
            />
            {errors.email && (
              <p className="mt-1.5 text-red-400 text-xs">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+966 XX XXX XXXX"
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                errors.phone
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-(--dht-red)"
              } text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                errors.phone
                  ? "focus:ring-red-500/50"
                  : "focus:ring-(--dht-red)/50"
              } transition-colors`}
            />
            {errors.phone && (
              <p className="mt-1.5 text-red-400 text-xs">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Service */}
          <div>
            <label
              htmlFor="service"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Service / Subject
            </label>
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-(--dht-red) focus:ring-1 focus:ring-(--dht-red)/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-(--dht-darker)">
                Select a service (optional)
              </option>
              {services.map((s) => (
                <option key={s} value={s} className="bg-(--dht-darker)">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Message <span className="text-(--dht-red)">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about your project or inquiry..."
              rows={5}
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                errors.message
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-(--dht-red)"
              } text-white placeholder-gray-500 focus:outline-none focus:ring-1 resize-none ${
                errors.message
                  ? "focus:ring-red-500/50"
                  : "focus:ring-(--dht-red)/50"
              } transition-colors`}
            />
            {errors.message && (
              <p className="mt-1.5 text-red-400 text-xs">
                {errors.message}
              </p>
            )}
          </div>

          {/* reCAPTCHA */}
          {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
            <div ref={recaptchaRef} className="flex justify-start" />
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-(--dht-red) text-white px-8 py-4 rounded-lg font-semibold hover:bg-(--dht-red-hover) transition-all duration-300 hover:shadow-2xl hover:shadow-(--dht-red)/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
