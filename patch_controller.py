import sys

filepath = sys.argv[1]
with open(filepath, "r") as f:
    content = f.read()

old = 'return {\n      id: user.id,\n      name: user.name,\n      email: user.email,\n      role: dto.role,\n    };'
new = 'return {\n      id: user.id,\n      name: user.name,\n      email: user.email,\n      role: dto.role,\n      password,\n    };'
content = content.replace(old, new)

with open(filepath, "w") as f:
    f.write(content)

print("Patched")
