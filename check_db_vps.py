import subprocess, json

r = subprocess.run(
    ["docker", "exec", "dht-postgres", "psql", "-U", "dht_admin", "-d", "dht_hub",
     "-c", "SELECT id, email, role FROM users ORDER BY created_at;"],
    capture_output=True, text=True
)
print("=== USERS ===")
print(r.stdout)
if r.stderr: print(r.stderr)

r2 = subprocess.run(
    ["docker", "exec", "dht-postgres", "psql", "-U", "dht_admin", "-d", "dht_hub",
     "-c", "SELECT id, user_id, substring(token::text, 1, 20) as token_prefix, created_at FROM sessions ORDER BY created_at DESC LIMIT 10;"],
    capture_output=True, text=True
)
print("=== SESSIONS (newest first) ===")
print(r2.stdout)
if r2.stderr: print(r2.stderr)

# Now create a fresh session and test list-users
import urllib.request, http.cookiejar

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Sign in through Nginx
data = json.dumps({"email": "supertekadmin@dhthub.com", "password": "Tekdht@2026"}).encode()
req = urllib.request.Request("http://51.79.251.154:8088/api/auth/sign-in/email", data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
print("=== SIGN IN ===")
print("Status:", resp.status)
body = json.loads(resp.read())
print("User:", body.get("user", {}).get("email"), "Role:", body.get("user", {}).get("role"))

# Now test get-session
req2 = urllib.request.Request("http://51.79.251.154:8088/api/auth/get-session")
resp2 = opener.open(req2)
session_data = json.loads(resp2.read())
print("=== GET SESSION ===")
print("Has session:", session_data.get("session") is not None)
print("User:", session_data.get("user", {}).get("email"))

# Now test list-users
req3 = urllib.request.Request("http://51.79.251.154:8088/api/auth/admin/list-users?limit=100")
resp3 = opener.open(req3)
body3 = resp3.read()
print("=== LIST USERS ===")
print("Status:", resp3.status)
print("Body size:", len(body3))
if body3:
    d3 = json.loads(body3)
    print("Users count:", len(d3.get("users", [])))
else:
    print("EMPTY BODY!")
    print("Cookies:", list(cj))
