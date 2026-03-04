Add enabled condition in React Query

For example:

useProduct(id)

should only run if id exists.

Example:

useQuery({
  queryKey: ['product', id],
  queryFn: () => getProductById(id),
  enabled: !!id
})

Otherwise React Query may fire invalid requests.

2️⃣ Add Search Support

Your backend supports search:

GET /products?search=bolt

So add a search box tied to query params.

Example:

search
categoryId
status
page
pageSize

This will become very important for 25k products.

3️⃣ Debounce Search

For performance.

Example:

300ms debounce

Otherwise typing will trigger too many API calls.

4️⃣ Display Variant Count in Table

Your UI currently shows SKU, but SKU belongs to variant.

Better column:

Default SKU
Variant Count

Example row:

SKU: HB-M6-20
Variants: 6

Otherwise SKU will appear missing.

5️⃣ Add Empty State

For when catalog is empty.

Example:

No products yet
[Add Product]

Small UX improvement.

6️⃣ Optimistic UI Updates (Optional)

For example when archiving product:

DELETE /products/:id

You can remove the row immediately before refetch.

7️⃣ Loading Skeletons

Instead of spinner for product table.

Example:

table skeleton rows

Better admin UX.

8️⃣ Error Handling

Add global error toast:

Product creation failed
Network error

This helps debugging.

9️⃣ Variant Creation UI

In the product detail sheet:

Form should include:

SKU
Name
Price
Quantity
Default checkbox

Example:

SKU: HB-M6-20
Name: M6 x 20
Price: 1.20
Quantity: 500
🔟 Category Tree Mapping

Your backend returns a category tree, not flat list.

Example:

Fastening & Joining
   └ Screws & Bolts
        └ Hex Bolts

So frontend should convert tree → dropdown options.

Small Structural Improvement

Your API folder should end up like this:

lib/api/catalog
   types.ts
   index.ts

   products.ts
   use-products.ts

   categories.ts
   use-categories.ts

Keep API functions and hooks separated.

Final Architecture

Your full stack now becomes:

Admin UI
   ↓
React Query Hooks
   ↓
API Client
   ↓
NestJS Controllers
   ↓
Services
   ↓
Repositories
   ↓
PostgreSQL

This matches the architecture described in the project summary. 

summary

Final Verdict

Your plan is very good and production-ready.

Only add:

search
debounce
variant count
enabled queries
error handling