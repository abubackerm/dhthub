with open("apps/api/src/modules/auth/controllers/users.controller.ts", "r") as f:
    content = f.read()

# Update return type to include password
old = 'Promise<{ id: string; name: string | null; email: string; role: string }>'
new = 'Promise<{ id: string; name: string | null; email: string; role: string; password: string }>'
if old in content:
    content = content.replace(old, new)
    with open("apps/api/src/modules/auth/controllers/users.controller.ts", "w") as f:
        f.write(content)
    print("Type patched")
else:
    print("Old type not found, checking...")
    import re
    match = re.search(r"Promise<\{[^}]+\}>", content)
    if match:
        print("Found:", match.group())
    else:
        print("No match found")
