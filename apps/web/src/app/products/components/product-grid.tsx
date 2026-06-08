import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, Heart } from "lucide-react"
import { useAddToCart } from "@/lib/api/cart"

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  category: string
  image: string
  rating: number
  reviews: number
  inStock: boolean
  featured?: boolean
  badge?: string
}

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  const addToCart = useAddToCart();

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {product.badge && (
                <Badge className="w-fit bg-(--dht-red) hover:bg-(--dht-red)">
                  {product.badge}
                </Badge>
              )}
              {product.originalPrice && (
                <Badge variant="destructive" className="w-fit">
                  Sale
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 h-9 w-9 bg-white/80 backdrop-blur-sm hover:bg-white shadow-md"
            >
              <Heart className="h-4 w-4 text-gray-700 hover:text-red-500" />
            </Button>
          </div>

          {/* Content */}
          <CardHeader className="space-y-2 pb-3">
            <Badge variant="outline" className="w-fit text-xs border-(--dht-red) text-(--dht-red)">
              {product.category}
            </Badge>
            <CardTitle className="line-clamp-1 text-lg text-gray-900">
              {product.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-gray-600">
              {product.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pb-3">
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.rating)
                        ? "fill-(--dht-red) text-(--dht-red)"
                        : "fill-gray-300 text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                ({product.reviews})
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                SAR {product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  SAR {product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${
                  product.inStock ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full bg-(--dht-red) hover:bg-(--dht-red-hover) text-white"
              disabled={!product.inStock}
              variant={product.inStock ? "default" : "outline"}
              onClick={() => {
                if (product.id) {
                  addToCart.mutate({ variantId: product.id, qty: 1 });
                }
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
