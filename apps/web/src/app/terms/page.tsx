import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Dynamic Hub Trading",
  description:
    "Terms and Conditions for Dynamic Hub Trading - Read our terms of service and usage policies.",
};

export default function TermsPage() {
  return (
    <article>
      {/* Hero */}
      <section className="bg-(--dht-dark) pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-(--dht-red) text-sm font-semibold uppercase tracking-widest mb-4">
            Terms &amp; Conditions
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Rules for Using
            <br />
            <span className="text-(--dht-red)">Our Services</span>
          </h1>
          <p className="mt-6 text-(--dht-gray) text-lg max-w-2xl mx-auto">
            Please read these terms carefully before accessing our website and
            services.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto divide-y divide-white/10">
          {/* 1. Introduction */}
          <TermsSection number="1" title="Introduction">
            <p>
              Welcome to Dynamic Hub Company. By accessing and using this
              website, you agree to comply with and be bound by the following
              Terms and Conditions. If you do not agree, please refrain from
              using this website.
            </p>
          </TermsSection>

          {/* 2. Use of Website */}
          <TermsSection number="2" title="Use of Website">
            <p>
              This website is intended to provide general information about our
              products, services, and procurement solutions.
            </p>
            <p>
              You agree to use this website only for lawful purposes and in a
              manner that does not infringe the rights of others or restrict
              their use of the website.
            </p>
          </TermsSection>

          {/* 3. Products & Services Information */}
          <TermsSection number="3" title="Products & Services Information">
            <p>
              All product descriptions, service details, and specifications
              provided on this website are for general informational purposes
              only.
            </p>
            <p>
              Dynamic Hub Company reserves the right to modify, update, or
              discontinue any product or service without prior notice.
            </p>
          </TermsSection>

          {/* 4. Quotations & Pricing */}
          <TermsSection number="4" title="Quotations & Pricing">
            <p>
              Any pricing, quotations, or proposals shared through this website
              or via communication channels are subject to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-(--dht-gray)">
              <li>
                Final confirmation based on project scope and requirements
              </li>
              <li>Availability of materials and supplier conditions</li>
              <li>Applicable taxes, duties, and logistics costs</li>
            </ul>
            <p className="mt-3">
              Formal quotations will be provided upon request and may have
              specific validity periods.
            </p>
          </TermsSection>

          {/* 5. Procurement & Supply */}
          <TermsSection number="5" title="Procurement & Supply">
            <p>
              Dynamic Hub Company acts as a supplier and procurement partner,
              sourcing materials and products from approved vendors and
              manufacturers.
            </p>
            <p>
              While we ensure quality and compliance, final specifications and
              approvals remain subject to project requirements and client
              confirmation.
            </p>
          </TermsSection>

          {/* 6. Intellectual Property */}
          <TermsSection number="6" title="Intellectual Property">
            <p>
              All content on this website, including text, graphics, logos, and
              images, is the property of Dynamic Hub Company or its licensors
              and is protected by applicable copyright and intellectual property
              laws.
            </p>
            <p>
              Unauthorised use, reproduction, or distribution is strictly
              prohibited.
            </p>
          </TermsSection>

          {/* 7. Limitation of Liability */}
          <TermsSection number="7" title="Limitation of Liability">
            <p>
              Dynamic Hub Company shall not be held liable for any direct,
              indirect, or consequential damages arising from the use of this
              website or reliance on its content.
            </p>
            <p>
              All information is provided &ldquo;as is&rdquo; without warranties
              of any kind, express or implied.
            </p>
          </TermsSection>

          {/* 8. External Links */}
          <TermsSection number="8" title="External Links">
            <p>
              This website may contain links to third-party websites for
              informational purposes. Dynamic Hub Company is not responsible for
              the content, accuracy, or practices of these external sites.
            </p>
          </TermsSection>

          {/* 9. Confidentiality */}
          <TermsSection number="9" title="Confidentiality">
            <p>
              Any information submitted through forms or communication channels
              will be handled with reasonable confidentiality. However, users
              are advised not to share sensitive or proprietary information
              unless required and agreed upon.
            </p>
          </TermsSection>

          {/* 10. Compliance & Regulations */}
          <TermsSection number="10" title="Compliance & Regulations">
            <p>
              Dynamic Hub Company operates in accordance with applicable industry
              standards, safety regulations, and compliance requirements relevant
              to its sectors, including oil &amp; gas, marine, and infrastructure
              projects.
            </p>
          </TermsSection>

          {/* 11. Changes to Terms */}
          <TermsSection number="11" title="Changes to Terms">
            <p>
              Dynamic Hub Company reserves the right to update or modify these
              Terms and Conditions at any time without prior notice. Continued
              use of the website constitutes acceptance of the updated terms.
            </p>
          </TermsSection>

          {/* 12. Governing Law */}
          <TermsSection number="12" title="Governing Law">
            <p>
              These Terms and Conditions shall be governed by and interpreted in
              accordance with the laws of the Kingdom of Saudi Arabia.
            </p>
          </TermsSection>

          {/* 13. Contact Information */}
          <TermsSection number="13" title="Contact Information">
            <p>
              For any questions regarding these Terms and Conditions, please
              contact:
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
          </TermsSection>
        </div>
      </section>
    </article>
  );
}

/* ── Reusable Section Component ────────────────────────────── */

function TermsSection({
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
