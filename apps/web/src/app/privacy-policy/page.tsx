import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Dynamic Hub Trading",
  description:
    "Privacy Policy for Dynamic Hub Trading - Learn how we collect, use, and safeguard your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <article>
      {/* Hero */}
      <section className="bg-(--dht-dark) pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-(--dht-red) text-sm font-semibold uppercase tracking-widest mb-4">
            Privacy Policy
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Protecting Your
            <br />
            <span className="text-(--dht-red)">Privacy</span>
          </h1>
          <p className="mt-6 text-(--dht-gray) text-lg max-w-2xl mx-auto">
            We are committed to safeguarding your personal information with
            transparency and care.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto divide-y divide-white/10">
          {/* 1. Introduction */}
          <PolicySection number="1" title="Introduction">
            <p>
              Dynamic Hub Company (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
              &ldquo;us&rdquo;) is committed to protecting your privacy and
              ensuring that your personal information is handled in a safe and
              responsible manner. This Privacy Policy outlines how we collect,
              use, and safeguard information when you visit our website or
              interact with our services.
            </p>
          </PolicySection>

          {/* 2. Information We Collect */}
          <PolicySection number="2" title="Information We Collect">
            <h3 className="text-lg font-semibold text-white mb-3">
              a. Personal Information
            </h3>
            <p>
              We may collect personal information that you voluntarily provide,
              including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-(--dht-gray)">
              <li>Name</li>
              <li>Company name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Project or enquiry details</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">
              b. Non-Personal Information
            </h3>
            <p>
              We may automatically collect certain technical information such
              as:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-(--dht-gray)">
              <li>IP address</li>
              <li>Browser type and device information</li>
              <li>Website usage data and analytics</li>
            </ul>
          </PolicySection>

          {/* 3. How We Use Your Information */}
          <PolicySection number="3" title="How We Use Your Information">
            <p>We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-(--dht-gray)">
              <li>Respond to enquiries and provide quotations</li>
              <li>
                Process requests for services, procurement, or partnerships
              </li>
              <li>Improve our website, services, and user experience</li>
              <li>
                Communicate updates, proposals, or relevant business information
              </li>
              <li>
                Ensure compliance with legal and regulatory requirements
              </li>
            </ul>
          </PolicySection>

          {/* 4. Information Sharing */}
          <PolicySection number="4" title="Information Sharing">
            <p>
              Dynamic Hub Company does not sell, rent, or trade your personal
              information. We may share information only in the following cases:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-(--dht-gray)">
              <li>
                With trusted suppliers or partners for project execution or
                procurement
              </li>
              <li>When required by law, regulation, or legal process</li>
              <li>To protect our rights, safety, or property</li>
            </ul>
          </PolicySection>

          {/* 5. Data Security */}
          <PolicySection number="5" title="Data Security">
            <p>
              We implement appropriate technical and organizational measures to
              protect your information from unauthorized access, disclosure,
              alteration, or destruction. However, no online transmission or
              storage system can be guaranteed as 100% secure.
            </p>
          </PolicySection>

          {/* 6. Cookies & Tracking Technologies */}
          <PolicySection number="6" title="Cookies & Tracking Technologies">
            <p>
              Our website may use cookies and similar technologies to enhance
              user experience, analyze website traffic, and improve performance.
              Users may choose to disable cookies through their browser settings.
            </p>
          </PolicySection>

          {/* 7. Third-Party Links */}
          <PolicySection number="7" title="Third-Party Links">
            <p>
              Our website may contain links to external websites. We are not
              responsible for the privacy practices or content of such
              third-party sites.
            </p>
          </PolicySection>

          {/* 8. Data Retention */}
          <PolicySection number="8" title="Data Retention">
            <p>
              We retain personal information only for as long as necessary to
              fulfill the purposes outlined in this policy or as required by
              applicable laws and regulations.
            </p>
          </PolicySection>

          {/* 9. Your Rights */}
          <PolicySection number="9" title="Your Rights">
            <p>Depending on applicable laws, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-(--dht-gray)">
              <li>Request access to your personal data</li>
              <li>Request correction or deletion of your data</li>
              <li>
                Withdraw consent for data usage (where applicable)
              </li>
            </ul>
            <p className="mt-3">
              Requests can be made by contacting us directly.
            </p>
          </PolicySection>

          {/* 10. Compliance with Regulations */}
          <PolicySection
            number="10"
            title="Compliance with Regulations"
          >
            <p>
              Dynamic Hub Company operates in accordance with applicable data
              protection laws and industry standards, including relevant
              regulations within the Kingdom of Saudi Arabia.
            </p>
          </PolicySection>

          {/* 11. Updates to This Policy */}
          <PolicySection number="11" title="Updates to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page, and continued use of the website
              constitutes acceptance of such updates.
            </p>
          </PolicySection>

          {/* 12. Contact Information */}
          <PolicySection number="12" title="Contact Information">
            <p>
              For any questions regarding this Privacy Policy or your data,
              please contact:
            </p>
            <div className="mt-4 p-5 rounded-lg bg-(--dht-dark) border border-white/10 inline-block">
              <p className="text-white font-semibold">
                Dynamic Hub Company
              </p>
              <p className="text-(--dht-gray) mt-1">
                &#9993; Email: info@dht-sa.com
              </p>
              <p className="text-(--dht-gray)">
                &#9742; Phone: 056 788 7123
              </p>
            </div>
          </PolicySection>
        </div>
      </section>
    </article>
  );
}

/* ── Reusable Section Component ────────────────────────────── */

function PolicySection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-12 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-(--dht-red) font-mono text-sm font-bold">
          {number}.
        </span>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="ml-8 space-y-3 text-(--dht-gray) leading-relaxed">
        {children}
      </div>
    </div>
  );
}
