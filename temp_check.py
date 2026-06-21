import sys, json
data = json.load(sys.stdin)
for p in data:
    print(f"Product: {p['name']}, SKU: {p.get('sku')}, slug: {p.get('slug')}, defaultVariantId: {p.get('defaultVariantId')}")
