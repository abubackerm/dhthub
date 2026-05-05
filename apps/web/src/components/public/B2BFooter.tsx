import Link from "next/link";
import Image from "next/image";

const catalogueLinks = [
  { label: "General Consumables", href: "/products" },
  { label: "Painting & Coatings", href: "/products" },
  { label: "Rotating Equipment", href: "/products" },
  { label: "Valves & Fittings", href: "/products" },
  { label: "Instrumentation", href: "/products" },
];

const servicesLinks = [
  { label: "Request a Quote (RFQ)", href: "#" },
  { label: "Upload BOM (Excel)", href: "#" },
  { label: "Aramco AVL Items", href: "#" },
  { label: "My Approved Items", href: "#" },
  { label: "Vendor Registration", href: "#" },
];

const companyLinks = [
  { label: "About Dynamic Hub", href: "/about" },
  { label: "Our Brands", href: "#" },
  { label: "Certifications", href: "#" },
  { label: "Contact Us", href: "/contact" },
  { label: "Careers", href: "#" },
];

export function B2BFooter() {
  return (
    <footer className="bg-[rgba(7,15,30,0.8)] backdrop-blur-[12px] border-t border-(--b2b-border) px-5 md:px-10 pt-10 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-9 mb-7">
        {/* Brand Column */}
        <div>
          <Link href="/" className="flex items-center gap-3 mb-3 group">
            <div className="w-11 h-11 bg-gradient-to-br from-(--b2b-orange) to-(--b2b-orange-lt) rounded-lg flex items-center justify-center font-extrabold text-[22px] text-white shadow-[0_2px_12px_rgba(245,98,15,0.3)]">
              DH
            </div>
            <div className="text-white font-bold text-[22px] leading-none">
              Dynamic Hub
              <span className="block text-[10px] font-normal text-(--b2b-steel) tracking-[2px] uppercase">
                Industrial Trading Co.
              </span>
            </div>
          </Link>
          <p className="text-xs text-(--b2b-steel) leading-[1.8]">
            Aramco Approved Vendor #10117241 · ISO 9001:2015<br />
            Eastern Province, Dammam, Saudi Arabia<br />
            15+ years supplying EPC and oil & gas contractors.
          </p>
        </div>

        {/* Catalogue Links */}
        <div>
          <h5 className="text-xs font-bold tracking-[2px] uppercase text-(--b2b-orange) mb-3.5">
            Catalogue
          </h5>
          {catalogueLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-xs text-(--b2b-steel) no-underline mb-2 py-0.5 hover:text-white hover:translate-x-1 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Services Links */}
        <div>
          <h5 className="text-xs font-bold tracking-[2px] uppercase text-(--b2b-orange) mb-3.5">
            Services
          </h5>
          {servicesLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-xs text-(--b2b-steel) no-underline mb-2 py-0.5 hover:text-white hover:translate-x-1 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Company Links */}
        <div>
          <h5 className="text-xs font-bold tracking-[2px] uppercase text-(--b2b-orange) mb-3.5">
            Company
          </h5>
          {companyLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-xs text-(--b2b-steel) no-underline mb-2 py-0.5 hover:text-white hover:translate-x-1 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-5 border-t border-[rgba(31,53,88,0.4)] gap-3">
        <p className="text-[11px] text-(--b2b-steel)">
          © 2026 Dynamic Hub Trading Co. Ltd. All rights reserved.
        </p>
        <div className="flex gap-2">
          {["Aramco AVL", "ISO 9001:2015", "IKTVA Participant"].map((badge) => (
            <span
              key={badge}
              className="bg-white/[0.05] border border-[rgba(31,53,88,0.5)] text-(--b2b-steel-lt) px-3 py-1.5 rounded text-[10px] font-semibold hover:border-(--b2b-orange) hover:text-(--b2b-orange) transition-all"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
