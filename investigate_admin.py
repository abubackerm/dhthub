"""Investigate Better Auth admin plugin to understand why list-users might return empty"""
import os

path = r"/home/ubuntu/dht-temp/node_modules/.pnpm/better-auth@1.5.5_@prisma+client@7.4.2_prisma@7.4.2_@types+react@19.2.14_react-dom@19.2.4_rea_vbmk6uine7estj6n7brzrwyma4/node_modules/better-auth/dist/plugins/admin/routes.mjs"

with open(path, encoding="utf-8", errors="ignore") as f:
    c = f.read()

# Find the listUsers implementation
idx = c.find("/admin/list-users")
if idx >= 0:
    print(f"=== listUsers endpoint at {idx} ===")
    print(c[max(0,idx-300):idx+1500])
    print()

# Find adminMiddleware
idx2 = c.find("adminMiddleware")
if idx2 >= 0:
    print(f"\n=== adminMiddleware at {idx2} ===")
    # Find the start of the definition
    start = c.rfind("\n", 0, idx2)
    print(c[start:idx2+500])
