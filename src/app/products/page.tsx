import { ProductGrid } from "./components/product-grid"
import { ProductFilters } from "./components/product-filters"

// Import data
import productsData from "./data/products.json"
import categoriesData from "./data/categories.json"

export const metadata = {
  title: "Products - Dynamic Hub",
  description: "Browse our extensive collection of products",
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[var(--dht-darker)] to-[var(--dht-red)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Our Products
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Browse our extensive collection of high-quality products for all your needs
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Product Catalog</h2>
          <p className="text-muted-foreground">
            Discover our range of premium products
          </p>
        </div>

        {/* Product Filters */}
        <ProductFilters categories={categoriesData} />

        {/* Product Grid */}
        <ProductGrid products={productsData} />
      </div>
    </div>
  )
}
