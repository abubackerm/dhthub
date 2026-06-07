import re

with open("/home/ubuntu/dht-temp/apps/web/src/proxy.ts", "r") as f:
    content = f.read()

old = """async function getSession(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  try {
    const res = await fetch(`${apiUrl}/api/auth/get-session`, {"""

new = """async function getSession(request: NextRequest) {
  // Use direct internal URL for server-side session check (avoid Nginx loop)
  const sessionApiUrl = process.env.INTERNAL_API_URL || "http://localhost:3010";
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  try {
    const res = await fetch(`${sessionApiUrl}/api/auth/get-session`, {"""

if old in content:
    content = content.replace(old, new)
    with open("/home/ubuntu/dht-temp/apps/web/src/proxy.ts", "w") as f:
        f.write(content)
    print("OK - proxy.ts fixed")
else:
    if "INTERNAL_API_URL" in content:
        print("ALREADY FIXED")
    else:
        print("ERROR: could not find old string or already different")
        m = re.search(r"async function getSession.*?^\}", content, re.DOTALL | re.MULTILINE)
        if m:
            print("Current getSession:")
            print(m.group(0))
