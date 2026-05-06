'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCategoryTree } from '@/lib/api/catalog/use-categories';
import type { CategoryTreeNode } from '@/lib/api/catalog/types';
import { 
  CheckCircle, 
  Building2, 
  Clock, 
  Truck, 
  Handshake
} from 'lucide-react';
import s from './mockup-homepage.module.css';
import './mockup-homepage.global.css';

export default function MockupHomepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['Stock Status']));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { data: categoryTree, isLoading } = useCategoryTree({ maxDepth: 2 });
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim() || !categoryTree) return [];

    const query = searchQuery.toLowerCase();
    const results: CategoryTreeNode[] = [];

    const flattenAndFilter = (categories: CategoryTreeNode[]) => {
      for (const category of categories) {
        if (category.name.toLowerCase().includes(query)) {
          results.push(category);
        }
        if (category.children && category.children.length > 0) {
          flattenAndFilter(category.children);
        }
      }
    };

    flattenAndFilter(categoryTree);
    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, categoryTree]);

  // Helper function to find a category by ID in the tree
  const findCategoryById = useCallback((id: string, tree: CategoryTreeNode[]): CategoryTreeNode | null => {
    for (const category of tree) {
      if (category.id === id) {
        return category;
      }
      if (category.children && category.children.length > 0) {
        const found = findCategoryById(id, category.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Debug: Check if children are populated
  if (!isLoading && categoryTree && categoryTree.length > 0) {
    console.log('=== Category Tree Structure ===');
    console.log('Total root categories:', categoryTree.length);
    categoryTree.forEach((cat) => {
      console.log(`- ${cat.name} (depth: ${cat.depth}, children: ${cat.children?.length || 0}, hasChildren: ${cat.hasChildren})`);
    });
    if (selectedCategoryId) {
      const selected = findCategoryById(selectedCategoryId, categoryTree);
      if (selected) {
        console.log('=== Selected Category ===');
        console.log('Name:', selected.name);
        console.log('Children count:', selected.children?.length || 0);
        console.log('Children:', selected.children?.map(c => c.name));
      }
    }
  }

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

  const toggleProfileDropdown = useCallback(() => {
    setProfileDropdownOpen((prev) => !prev);
  }, []);

  // Get random categories for popular search tags (memoized to stay stable)
  const randomCategories = useMemo(() => {
    if (!categoryTree || categoryTree.length === 0) return [];
    
    // Flatten the tree to get all categories
    const flattenCategories = (categories: CategoryTreeNode[]): CategoryTreeNode[] => {
      let result: CategoryTreeNode[] = [];
      for (const category of categories) {
        result.push(category);
        if (category.children && category.children.length > 0) {
          result = result.concat(flattenCategories(category.children));
        }
      }
      return result;
    };

    const allCategories = flattenCategories(categoryTree);
    
    // Shuffle and pick 3-5 random categories (to fit on one line)
    const shuffled = allCategories.sort(() => Math.random() - 0.5);
    const numTags = Math.min(Math.floor(Math.random() * 3) + 3, allCategories.length);
    
    return shuffled.slice(0, numTags);
  }, [categoryTree]);


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
          <a href="/contact">Contact Us</a>
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
          <a href="/cart" className={s.cartIcon} title="Cart">
            🛒
            <div className={s.cartBadge}>0</div>
          </a>
          <div className={s.profileDropdown}>
            <button className={s.profileBtn} onClick={toggleProfileDropdown}>
              👤 Super Admin
              <span className={s.dropdownChevron}>▼</span>
            </button>
            {profileDropdownOpen && (
              <div className={s.profileDropdownMenu}>
                <a href="/dashboard">Dashboard</a>
                <a href="/profile">Profile</a>
                <a href="/settings">Settings</a>
                <div className={s.dropdownDivider}></div>
                <a href="/sign-out" className={s.signOut}>Sign Out</a>
              </div>
            )}
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
              background: 'var(--dht-red)',
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
        <a href="/cart" onClick={closeMenu}>
          🛒 Cart{' '}
          <span
            style={{
              background: 'var(--dht-red)',
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
        <a href="/dashboard" onClick={closeMenu} style={{ color: 'var(--dht-red)' }}>
          👤 Dashboard
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
          <div 
            ref={searchContainerRef}
            className={s.searchBar} 
            style={{ position: 'relative', maxWidth: '570px', margin: '0 auto' }}
          >
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              style={{ width: '100%' }}
            />
            
            {/* Search Results Dropdown */}
            {showSearchDropdown && filteredCategories.length > 0 && (
              <div 
                className={s.searchDropdown}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  marginTop: '4px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 9999,
                }}
              >
                {filteredCategories.map((category) => (
                  <a
                    key={category.id}
                    href={`/products/${category.slug}`}
                    className={s.searchResultItem}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: '#1A3260',
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div 
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--dht-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : (
                        '📦'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1A3260' }}>{category.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {category.productCount || 0} products
                      </div>
                    </div>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{ color: 'var(--dht-gray)' }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
            
            {/* No Results Message */}
            {showSearchDropdown && searchQuery.trim() && filteredCategories.length === 0 && (
              <div 
                className={s.searchNoResults}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  marginTop: '4px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  zIndex: 9999,
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                <div style={{ color: '#6B7280', fontSize: '14px' }}>No categories found for "{searchQuery}"</div>
              </div>
            )}
          </div>
          <div className={s.searchTags}>
            <span>Popular:</span>
            {randomCategories.map((category) => (
              <a key={category.id} href={`/products/${category.slug}`}>
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className={s.trustBar}>
        <div className={s.trustItem}>
          <div className={s.tIcon}>
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className={s.tText}>
            <strong>Aramco Approved</strong>
            <span>Vendor #10117241</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className={s.tText}>
            <strong>15+ Years</strong>
            <span>Eastern Province Operations</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>
            <Clock className="w-5 h-5" />
          </div>
          <div className={s.tText}>
            <strong>RFQ in 24 Hours</strong>
            <span>Fast Quote Turnaround</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>
            <Truck className="w-5 h-5" />
          </div>
          <div className={s.tText}>
            <strong>Local Stock</strong>
            <span>Dammam Warehouse</span>
          </div>
        </div>
        <div className={s.trustSep}></div>
        <div className={s.trustItem}>
          <div className={s.tIcon}>
            <Handshake className="w-5 h-5" />
          </div>
          <div className={s.tText}>
            <strong>EPC &amp; Contractor Accounts</strong>
            <span>Credit Terms Available</span>
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className={s.categories}>
        <div className={s.sectionLabel}>Browse by Category</div>
        <div className={s.catGrid} style={{ padding: '16px' }}>
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={s.catCard} style={{ pointerEvents: 'none' }}>
                <div className={s.catIcon} style={{ opacity: 0.3 }}>⚙️</div>
                <h4 style={{ opacity: 0.3 }}>Loading...</h4>
                <span style={{ opacity: 0.3 }}>-- items</span>
              </div>
            ))
          ) : categoryTree && categoryTree.length > 0 ? (
            categoryTree
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((category) => (
                <a
                  key={category.id}
                  className={s.catCard}
                  href={`/products/${category.slug}`}
                >
                  <div className={s.catIcon}>
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        style={{ borderRadius: '8px' }}
                      />
                    ) : (
                      '📦'
                    )}
                  </div>
                  <h4>{category.name}</h4>
                </a>
              ))
          ) : (
            // Empty state
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              <p>No categories available</p>
            </div>
          )}
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
            {isLoading ? (
              <div style={{ padding: '8px 0', color: 'var(--dht-gray)' }}>Loading...</div>
            ) : categoryTree && categoryTree.length > 0 ? (
              categoryTree
                .filter((category) => category.depth === 0)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((category) => (
                  <FilterItem
                    key={category.id}
                    id={`fc-${category.id}`}
                    label={category.name}
                    count={category.productCount}
                    checked={selectedCategoryId === category.id}
                    onChange={() => setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id)}
                    type="radio"
                  />
                ))
            ) : (
              <div style={{ padding: '8px 0', color: 'var(--dht-gray)' }}>No categories</div>
            )}
          </FilterGroup>
        </div>

        {/* PRODUCT AREA */}
        <div className={s.productArea}>
          <button className={s.mobileFilterBtn} onClick={openSidebar}>
            ⚙ Filters
          </button>
          <div className={s.catalogueToolbar}>
            <p className={s.results}>
              {isLoading ? (
                'Loading categories...'
              ) : categoryTree && categoryTree.length > 0 ? (
                (() => {
                  const selectedMainCategory = selectedCategoryId
                    ? findCategoryById(selectedCategoryId, categoryTree)
                    : null;

                  let categoriesToShow = categoryTree;
                  if (selectedMainCategory && selectedMainCategory.children && selectedMainCategory.children.length > 0) {
                    categoriesToShow = selectedMainCategory.children;
                  } else if (selectedMainCategory) {
                    categoriesToShow = [selectedMainCategory];
                  } else {
                    categoriesToShow = categoryTree.filter((cat) => cat.depth === 0);
                  }

                  const count = categoriesToShow.length;
                  return selectedMainCategory
                    ? `Showing ${count} subcategor${count === 1 ? 'y' : 'ies'} under ${selectedMainCategory.name}`
                    : `Showing all ${count} main categor${count === 1 ? 'y' : 'ies'}`;
                })()
              ) : (
                'No categories'
              )}
            </p>
            <div className={s.toolbarRight}>
            </div>
          </div>

          <div className={s.productGrid} style={{ padding: '16px' }}>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={s.productCard} style={{ pointerEvents: 'none' }}>
                  <div className={s.productImg} style={{ opacity: 0.3 }}>⚙️</div>
                  <div className={s.productBody}>
                    <div className={s.productName} style={{ opacity: 0.3 }}>Loading...</div>
                  </div>
                </div>
              ))
            ) : categoryTree && categoryTree.length > 0 ? (
              // Get categories to display based on selection
              (() => {
                // Find selected main category using recursive search
                const selectedMainCategory = selectedCategoryId
                  ? findCategoryById(selectedCategoryId, categoryTree)
                  : null;

                // If a category is selected and has children, show children
                let categoriesToShow: typeof categoryTree = [];

                if (selectedMainCategory) {
                  // Check if it has children
                  if (selectedMainCategory.children && selectedMainCategory.children.length > 0) {
                    categoriesToShow = selectedMainCategory.children;
                  } else {
                    // No children, show just this category
                    categoriesToShow = [selectedMainCategory];
                  }
                } else {
                  // No selection - show all main categories (depth 0)
                  categoriesToShow = categoryTree.filter((cat) => cat.depth === 0);
                }

                // Sort alphabetically
                categoriesToShow = categoriesToShow
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name));

                if (categoriesToShow.length === 0) {
                  return (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                      <p>No categories found</p>
                    </div>
                  );
                }

                return categoriesToShow.map((category) => (
                  <a
                    key={category.id}
                    className={s.productCard}
                    href={`/products/${category.slug}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className={s.productImg}>
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        '📦'
                      )}
                    </div>
                    <div className={s.productBody}>
                      <div className={s.productName}>{category.name}</div>
                    </div>
                  </a>
                ));
              })()
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                <p>No categories available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WHATSAPP FLOATING BUTTON */}
      <a
        className={s.waBtn}
        href="https://wa.me/966XXXXXXXXX"
        title="Chat on WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          backgroundColor: '#25D366',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          zIndex: 1000,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="36"
          height="36"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
        </svg>
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
            {isLoading ? (
              <a href="#">Loading...</a>
            ) : categoryTree && categoryTree.length > 0 ? (
              categoryTree.slice(0, 5).map((category) => (
                <a key={category.id} href={`/products/${category.slug}`}>
                  {category.name}
                </a>
              ))
            ) : (
              <a href="/products">All Products</a>
            )}
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
  checked,
  onChange,
  type = 'checkbox',
}: {
  id: string;
  label: string;
  count?: number;
  checked?: boolean;
  onChange?: () => void;
  type?: 'checkbox' | 'radio';
}) {
  return (
    <div className={s.filterItem}>
      <input
        type={type}
        checked={checked}
        onChange={onChange}
        id={id}
      />
      <label htmlFor={id}>
        {label}
        {count !== undefined && count > 0 && <span className={s.filterCount}>{count}</span>}
      </label>
    </div>
  );
}
