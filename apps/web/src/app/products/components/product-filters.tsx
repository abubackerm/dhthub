import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SlidersHorizontal, X } from "lucide-react"

interface Category {
  id: string
  name: string
  count: number
}

interface ProductFiltersProps {
  categories: Category[]
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Filters Left */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          {categories.slice(0, 4).map((category) => (
            category.name !== "All Products" && (
              <Badge
                key={category.id}
                variant="secondary"
                className="cursor-pointer hover:bg-accent"
              >
                {category.name}
                <button className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          ))}
        </div>

        {/* Sort Right */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select defaultValue="featured">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
