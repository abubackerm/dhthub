"""Test list-users without session cookie - simulate what happens if cookies aren't sent"""
import http.client, json

conn = http.client.HTTPConnection("51.79.251.154", 8088)

# Test 1: No cookie at all
conn.request("GET", "/api/auth/admin/list-users?limit=100")
resp = conn.getresponse()
body = resp.read()
print(f"Test 1 - No cookie: status={resp.status} size={len(body)} body={body[:100]}")

# Test 2: With an empty/invalid cookie
conn.request("GET", "/api/auth/admin/list-users?limit=100", headers={"Cookie": "better-auth.session_token=invalid"})
resp2 = conn.getresponse()
body2 = resp2.read()
print(f"Test 2 - Invalid cookie: status={resp2.status} size={len(body2)} body={body2[:100]}")

# Test 3: Sign in properly and then list
body_si = json.dumps({"email": "supertekadmin@dhthub.com", "password": "Tekdht@2026"})
conn.request("POST", "/api/auth/sign-in/email", body=body_si, headers={"Content-Type": "application/json"})
resp_si = conn.getresponse()
set_cookie = resp_si.headers.get("Set-Cookie", "")
cookie_val = set_cookie.split(";")[0] if set_cookie else ""
resp_si.read()

# Test 3a: list with credentials
conn.request("GET", "/api/auth/admin/list-users?limit=100", headers={"Cookie": cookie_val})
resp3 = conn.getresponse()
body3 = resp3.read()
print(f"\nTest 3 - Valid cookie: status={resp3.status} size={len(body3)}")
if body3:
    d3 = json.loads(body3.decode())
    print(f"  Users: {len(d3.get('users',[]))}")
else:
    print("  EMPTY!")

# Test 4: list with valid cookie but Origin header that might cause issues
conn.request("GET", "/api/auth/admin/list-users?limit=100", headers={"Cookie": cookie_val, "Origin": "http://51.79.251.154:8088"})
resp4 = conn.getresponse()
body4 = resp4.read()
print(f"\nTest 4 - With Origin header: status={resp4.status} size={len(body4)}")
if body4:
    d4 = json.loads(body4.decode())
    print(f"  Users: {len(d4.get('users',[]))}")
else:
    print("  EMPTY!")
