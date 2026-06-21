import sys, json
d = json.load(sys.stdin)
print(f"type: {d.get('type')}")
print(f"sku in keys: {'sku' in d}")
print(f"All keys: {list(d.keys())}")
if 'variants' in d:
    for v in d['variants']:
        print(f"Variant: sku={v.get('sku')}, name={v.get('name')}, isDefault={v.get('isDefault')}")
