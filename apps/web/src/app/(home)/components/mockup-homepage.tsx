'use client';

import { useState, useCallback } from 'react';
import s from './mockup-homepage.module.css';
import './mockup-homepage.global.css';

export default function MockupHomepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['Stock Status']));

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const toggleFilterGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="mockup-homepage">
      {/* TOP BAR */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <span>Aramco Approved Vendor #10117241</span>
          <span>ISO 9001:2015 Certified</span>
          <span>Eastern Province, Saudi Arabia</span>
        </div>
        <div>
          <a href="#">+966 XX XXX XXXX</a>
          <a href="#">info@dynamichub.com.sa</a>
          <a href="#">العربية</a>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={s.navbar}>
        <a href="/" className={s.logo}>
          <div className={s.logoBox}>DH</div>
          <div className={s.logoText}>
            Dynamic Hub
            <span>Industrial Trading Co. Ltd.</span>
          </div>
        </a>
        <div className={s.navLinks}>
          <a href="/" className={s.active}>Home</a>
          <a href="/products">Products</a>
          <a href="/about">About Us</a>
          <a href="#">Our Divisions</a>
          <a href="#">Contact Us</a>
        </div>
        <div className={s.navActions}>
          <button
            className={`${s.mobileMenuBtn} ${menuOpen ? s.active : ''}`}
            onClick={toggleMenu}
            aria-label="Open menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={s.cartIcon} title="Cart">
            🛒
            <div className={s.cartBadge}>0</div>
          </div>
          <div className={s.profileDropdown}>
            <button className={s.profileBtn}>
              👤 Super Admin
              <span className={s.dropdownChevron}>▼</span>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`${s.mobileMenu} ${menuOpen ? s.open : ''}`}>
        <button
          className={s.mobileMenuClose}
          onClick={closeMenu}
          aria-label="Close menu"
        >
          ✕
        </button>
        <a href="/" className={s.active} onClick={closeMenu}>Home</a>
        <a href="/products" onClick={closeMenu}>Products</a>
        <a href="/about" onClick={closeMenu}>About Us</a>
        <a href="#" onClick={closeMenu}>Our Divisions</a>
        <a href="#" onClick={closeMenu}>Contact Us</a>
        <div className={s.mobileMenuDivider}></div>
        <a
          href="#"
          onClick={closeMenu}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          🛒 Cart{' '}
          <span
            style={{
              background: 'var(--dht-orange)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            0
          </span>
        </a>
        <a href="#" onClick={closeMenu} style={{ color: 'var(--dht-orange)' }}>
          👤 Super Admin
        </a>
      </div>

      {/* HERO + SEARCH */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroBadge}>Saudi Arabia&apos;s B2B Industrial Marketplace</div>
          <h1>
            Find the Right Part.
            <br />
            <span>Get a Quote. Done.</span>
          </h1>
          <p>Trusted by Aramco contractors, EPC companies, and drilling teams across the Eastern Province.</p>
          <div className={s.searchBar}>
            <select className={s.searchSelect}>
              <option>All Categories</option>
              <option>General Consumables</option>
              <option>Painting &amp; Coatings</option>
              <option>Rotating Equipment</option>
              <option>Instrumentation</option>
              <option>PPE &amp; Safety</option>
              <option>Valves &amp; Fittings</option>
              <option>Office Stationery</option>
            </select>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search by part number, description, or Aramco spec…"
            />
            <button className={s.searchBtn}>🔍 SEARCH</button>
          </div>
          <div className={s.searchTags}>
            <span>Popular:</span>
            <a href="#">Butterfly Valves</a>
            <a href="#">High-Pressure Hose</a>
            <a href="#">Lubrication Systems</a>
            <a href="#">Tarpaulin</a>
            <a href="#">Protective Coatings</a>
            <a href="#">Welding Consumables</a>
            <a href="#">PPE</a>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className={s.trustBar}>
        <div className={s.trustItem}>
          <div className={s.tIcon}>✅</div>
          <div className={s.tText}>
            <strong>Aramco Approved</strong>
            <span>Vendor #10117241</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>🏭</div>
          <div className={s.tText}>
            <strong>15+ Years</strong>
            <span>Eastern Province Operations</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>📋</div>
          <div className={s.tText}>
            <strong>RFQ in 24 Hours</strong>
            <span>Fast Quote Turnaround</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>🚚</div>
          <div className={s.tText}>
            <strong>Local Stock</strong>
            <span>Dammam Warehouse</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>🤝</div>
          <div className={s.tText}>
            <strong>EPC &amp; Contractor Accounts</strong>
            <span>Credit Terms Available</span>
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className={s.categories}>
        <div className={s.sectionLabel}>Browse by Category</div>
        <div className={s.catGrid}>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🔧</div>
            <h4>General Consumables</h4>
            <span>420+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🎨</div>
            <h4>Painting &amp; Coatings</h4>
            <span>150+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>⚙️</div>
            <h4>Rotating Equipment</h4>
            <span>230+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🔩</div>
            <h4>Valves &amp; Fittings</h4>
            <span>340+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🛡️</div>
            <h4>PPE &amp; Safety</h4>
            <span>180+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🩺</div>
            <h4>Instrumentation</h4>
            <span>90+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🪣</div>
            <h4>Spill Control</h4>
            <span>60+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🏗️</div>
            <h4>Rigging &amp; Lifting</h4>
            <span>120+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🪛</div>
            <h4>Welding Consumables</h4>
            <span>200+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>🏭</div>
            <h4>Aluminium Foundry</h4>
            <span>80+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>📦</div>
            <h4>Hessian &amp; Tarpaulin</h4>
            <span>45+ items</span>
          </a>
          <a className={s.catCard} href="/products">
            <div className={s.catIcon}>📎</div>
            <h4>Office Stationery</h4>
            <span>300+ items</span>
          </a>
        </div>
      </section>

      {/* QUICK ACCESS CARDS */}
      <section className={s.quickSection}>
        <div className={s.sectionLabel}>Quick Access</div>
        <div className={s.quickCards}>
          <div className={s.quickCard}>
            <div className={s.qcIcon}>📤</div>
            <div className={s.qcText}>
              <h4>Upload Excel BOM</h4>
              <p>Upload your bill of materials and get an instant quote for all items at once.</p>
            </div>
            <div className={s.qcArrow}>→</div>
          </div>
          <div className={s.quickCard}>
            <div className={s.qcIcon}>⭐</div>
            <div className={s.qcText}>
              <h4>My Approved Items</h4>
              <p>Your company&apos;s saved and pre-approved product list for repeat orders.</p>
            </div>
            <div className={s.qcArrow}>→</div>
          </div>
          <div className={s.quickCard}>
            <div className={s.qcIcon}>🛢️</div>
            <div className={s.qcText}>
              <h4>Aramco-Approved Items</h4>
              <p>Browse only items on the Aramco Approved Vendor List (AVL).</p>
            </div>
            <div className={s.qcArrow}>→</div>
          </div>
        </div>
      </section>

      {/* CATALOGUE PAGE HEADER */}
      <div className={s.pageHeader}>
        <div>
          <h2>Product Catalogue — General Consumables</h2>
          <div className={s.breadcrumb}>
            <a href="#">Home</a> → <a href="#">Catalogue</a> → General Consumables
          </div>
        </div>
      </div>

      {/* CATALOGUE WITH SIDEBAR + GRID */}
      <section className={s.catalogue}>
        {/* SIDEBAR OVERLAY (mobile) */}
        <div
          className={`${s.sidebarOverlay} ${sidebarOpen ? s.open : ''}`}
          onClick={closeSidebar}
        />

        {/* SIDEBAR FILTERS */}
        <div className={`${s.sidebar} ${sidebarOpen ? s.mobileOpen : ''}`}>
          <h3>⚙ Filters</h3>

          <FilterGroup
            name="Category"
            collapsed={collapsedGroups.has('Category')}
            onToggle={() => toggleFilterGroup('Category')}
          >
            <FilterItem id="fc1" label="General Consumables" count={420} defaultChecked />
            <FilterItem id="fc2" label="Painting &amp; Coatings" count={150} />
            <FilterItem id="fc3" label="Rotating Equipment" count={230} />
            <FilterItem id="fc4" label="Valves &amp; Fittings" count={340} />
          </FilterGroup>

          <FilterGroup
            name="Brand"
            collapsed={collapsedGroups.has('Brand')}
            onToggle={() => toggleFilterGroup('Brand')}
          >
            <FilterItem id="fb1" label="Wouter Witzel" defaultChecked />
            <FilterItem id="fb2" label="SPIR STAR" />
            <FilterItem id="fb3" label="Danfoss" />
            <FilterItem id="fb4" label="Lincoln Industrial" />
            <FilterItem id="fb5" label="Sari Coat" />
          </FilterGroup>

          <FilterGroup
            name="Aramco Compliance"
            collapsed={collapsedGroups.has('Aramco Compliance')}
            onToggle={() => toggleFilterGroup('Aramco Compliance')}
          >
            <FilterItem id="fa1" label="Aramco AVL Only" />
            <FilterItem id="fa2" label="SAES Compliant" />
            <FilterItem id="fa3" label="9COM Listed" />
          </FilterGroup>

          <FilterGroup
            name="Stock Status"
            collapsed={collapsedGroups.has('Stock Status')}
            onToggle={() => toggleFilterGroup('Stock Status')}
          >
            <FilterItem id="fs1" label="In Stock" />
            <FilterItem id="fs2" label="Available to Order" />
          </FilterGroup>

          <button className={s.btnClear}>Clear All Filters</button>
        </div>

        {/* PRODUCT AREA */}
        <div className={s.productArea}>
          <button className={s.mobileFilterBtn} onClick={openSidebar}>
            ⚙ Filters
          </button>
          <div className={s.catalogueToolbar}>
            <p className={s.results}>
              Showing <strong>24</strong> of <strong>420</strong> products
            </p>
            <div className={s.toolbarRight}>
              <select className={s.sortSelect}>
                <option>Sort: Relevance</option>
                <option>Sort: Newest</option>
                <option>Sort: A–Z</option>
              </select>
            </div>
          </div>

          <div className={s.productGrid}>
            {/* Card 1 */}
            <div className={s.productCard}>
              <div className={s.aramcoBadge}>Aramco AVL</div>
              <div className={`${s.approvedTick} ${s.active}`} title="Saved to My Approved Items">
                ✓
              </div>
              <div className={`${s.productImg} ${s.color1}`}>🔩</div>
              <div className={s.productBody}>
                <div className={s.productBrand}>Wouter Witzel</div>
                <div className={s.productName}>Butterfly Valve — Triple Offset</div>
                <div className={s.productSpec}>
                  Sizes: 2&quot; – 48&quot; | Body: Carbon Steel | Rating: ANSI 150–600
                </div>
                <div className={s.specTags}>
                  <span className={s.specTag}>ASME B16.34</span>
                  <span className={s.specTag}>API 609</span>
                  <span className={s.specTag}>Fire Safe</span>
                </div>
                <div className={s.productFooter}>
                  <div className={s.stockStatus}>
                    <div className={s.stockDot}></div>
                    <span>In Stock</span>
                  </div>
                  <button className={s.btnQuote}>+ Add to Quote</button>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className={s.productCard}>
              <div className={s.aramcoBadge}>Aramco AVL</div>
              <div className={s.approvedTick} title="Save to My Approved Items">
                ☆
              </div>
              <div className={`${s.productImg} ${s.color2}`}>🛢️</div>
              <div className={s.productBody}>
                <div className={s.productBrand}>SPIR STAR</div>
                <div className={s.productName}>High-Pressure Hose Assembly</div>
                <div className={s.productSpec}>
                  Pressure: up to 3,000 bar | Temp: -40°C to +200°C | Multiple end fittings
                </div>
                <div className={s.specTags}>
                  <span className={s.specTag}>SAE 100R15</span>
                  <span className={s.specTag}>Oil &amp; Gas</span>
                </div>
                <div className={s.productFooter}>
                  <div className={s.stockStatus}>
                    <div className={s.stockDot}></div>
                    <span>In Stock</span>
                  </div>
                  <button className={s.btnQuote}>+ Add to Quote</button>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className={s.productCard}>
              <div className={s.approvedTick} title="Save to My Approved Items">
                ☆
              </div>
              <div className={`${s.productImg} ${s.color3}`}>🌡️</div>
              <div className={s.productBody}>
                <div className={s.productBrand}>Danfoss</div>
                <div className={s.productName}>Pressure Transmitter</div>
                <div className={s.productSpec}>
                  Range: 0–600 bar | Output: 4–20mA HART | IP67 Protection
                </div>
                <div className={s.specTags}>
                  <span className={s.specTag}>ATEX</span>
                  <span className={s.specTag}>IECEx</span>
                  <span className={s.specTag}>4–20mA</span>
                </div>
                <div className={s.productFooter}>
                  <div className={s.stockStatus}>
                    <div className={`${s.stockDot} ${s.low}`}></div>
                    <span>Low Stock (4 pcs)</span>
                  </div>
                  <button className={s.btnQuote}>+ Add to Quote</button>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className={s.productCard}>
              <div className={s.aramcoBadge}>9COM</div>
              <div className={`${s.approvedTick} ${s.active}`} title="Saved to My Approved Items">
                ✓
              </div>
              <div className={`${s.productImg} ${s.color1}`}>🔧</div>
              <div className={s.productBody}>
                <div className={s.productBrand}>Lincoln Industrial</div>
                <div className={s.productName}>Automatic Lubrication System</div>
                <div className={s.productSpec}>
                  Single-point &amp; multi-point | Pump capacity: 0.5L–5L | 24VDC
                </div>
                <div className={s.specTags}>
                  <span className={s.specTag}>ISO 6743</span>
                  <span className={s.specTag}>Grease &amp; Oil</span>
                </div>
                <div className={s.productFooter}>
                  <div className={s.stockStatus}>
                    <div className={s.stockDot}></div>
                    <span>In Stock</span>
                  </div>
                  <button className={s.btnQuote}>+ Add to Quote</button>
                </div>
              </div>
            </div>

            {/* Card 5 */}
            <div className={s.productCard}>
              <div className={s.approvedTick} title="Save to My Approved Items">
                ☆
              </div>
              <div className={`${s.productImg} ${s.color2}`}>🎨</div>
              <div className={s.productBody}>
                <div className={s.productBrand}>Sari Coat</div>
                <div className={s.productName}>Epoxy Protective Coating</div>
                <div className={s.productSpec}>
                  2-part epoxy | DFT: 100–300 microns | Offshore &amp; Onshore grade
                </div>
                <div className={s.specTags}>
                  <span className={s.specTag}>NACE SP0169</span>
                  <span className={s.specTag}>Offshore</span>
                </div>
                <div className={s.productFooter}>
                  <div className={s.stockStatus}>
                    <div className={s.stockDot}></div>
                    <span>In Stock</span>
                  </div>
                  <button className={s.btnQuote}>+ Add to Quote</button>
                </div>
              </div>
            </div>

            {/* Card 6 */}
            <div className={s.productCard}>
              <div className={s.approvedTick} title="Save to My Approved Items">
                ☆
              </div>
              <div className={`${s.productImg} ${s.color3}`}>🏗️</div>
              <div className={s.productBody}>
                <div className={s.productBrand}>Dynamic Hub</div>
                <div className={s.productName}>Heavy-Duty Tarpaulin</div>
                <div className={s.productSpec}>
                  GSM: 180–400 | Sizes: 3×4m to 10×15m | UV stabilised, PE/PP
                </div>
                <div className={s.specTags}>
                  <span className={s.specTag}>UV Resistant</span>
                  <span className={s.specTag}>Waterproof</span>
                </div>
                <div className={s.productFooter}>
                  <div className={s.stockStatus}>
                    <div className={s.stockDot}></div>
                    <span>In Stock</span>
                  </div>
                  <button className={s.btnQuote}>+ Add to Quote</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP */}
      <a className={s.waBtn} href="https://wa.me/966XXXXXXXXX" title="Chat on WhatsApp">
        💬
      </a>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <div className={s.logo} style={{ marginBottom: '12px' }}>
              <div className={s.logoBox}>DH</div>
              <div className={s.logoText}>
                Dynamic Hub<span>Industrial Trading Co.</span>
              </div>
            </div>
            <p>
              Aramco Approved Vendor #10117241 · ISO 9001:2015
              <br />
              Eastern Province, Dammam, Saudi Arabia
              <br />
              15+ years supplying EPC and oil &amp; gas contractors.
            </p>
          </div>
          <div className={s.footerCol}>
            <h5>Catalogue</h5>
            <a href="#">General Consumables</a>
            <a href="#">Painting &amp; Coatings</a>
            <a href="#">Rotating Equipment</a>
            <a href="#">Valves &amp; Fittings</a>
            <a href="#">Instrumentation</a>
          </div>
          <div className={s.footerCol}>
            <h5>Services</h5>
            <a href="#">Request a Quote (RFQ)</a>
            <a href="#">Upload BOM (Excel)</a>
            <a href="#">Aramco AVL Items</a>
            <a href="#">My Approved Items</a>
            <a href="#">Vendor Registration</a>
          </div>
          <div className={s.footerCol}>
            <h5>Company</h5>
            <a href="#">About Dynamic Hub</a>
            <a href="#">Our Brands</a>
            <a href="#">Certifications</a>
            <a href="#">Contact Us</a>
            <a href="#">Careers</a>
          </div>
        </div>
        <div className={s.footerBottom}>
          <p>© 2026 Dynamic Hub Trading Co. Ltd. All rights reserved.</p>
          <div className={s.certBadges}>
            <span className={s.certBadge}>Aramco AVL</span>
            <span className={s.certBadge}>ISO 9001:2015</span>
            <span className={s.certBadge}>IKTVA Participant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function FilterGroup({
  name,
  collapsed,
  onToggle,
  children,
}: {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`${s.filterGroup} ${collapsed ? s.collapsed : ''}`}>
      <div className={s.filterGroupHeader} onClick={onToggle}>
        <h4>{name}</h4>
        <span className={s.filterGroupChevron}>▼</span>
      </div>
      <div className={s.filterGroupBody}>{children}</div>
    </div>
  );
}

function FilterItem({
  id,
  label,
  count,
  defaultChecked,
}: {
  id: string;
  label: string;
  count?: number;
  defaultChecked?: boolean;
}) {
  return (
    <div className={s.filterItem}>
      <input type="checkbox" defaultChecked={defaultChecked} id={id} />
      <label htmlFor={id}>
        {label}
        {count !== undefined && <span className={s.filterCount}>{count}</span>}
      </label>
    </div>
  );
}
