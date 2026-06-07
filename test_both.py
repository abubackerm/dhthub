import urllib.request, json, sys
from http.cookiejar import CookieJar

cj = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Sign in
data = json.dumps({"email": "supertekadmin@dhthub.com", "password": "Tekdht@2026"}).encode()
req = urllib.request.Request("http://localhost:3010/api/auth/sign-in/email", data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
print("Sign in OK:", json.loads(resp.read()).get("user", {}).get("role"))

# List users
req2 = urllib.request.Request("http://localhost:3010/api/auth/admin/list-users?limit=100")
resp2 = opener.open(req2)
body = resp2.read()
d = json.loads(body) if body else {}
print("Users count:", len(d.get("users", [])))

# Now test through Nginx as well
cj2 = CookieJar()
opener2 = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj2))
req3 = urllib.request.Request("http://51.79.251.154:8088/api/auth/sign-in/email", data=data, headers={"Content-Type": "application/json"})
resp3 = urllib.request.urlopen(req3)
print("\nVia Nginx sign in OK")

req4 = urllib.request.Request("http://51.79.251.154:8088/api/auth/admin/list-users?limit=100")
resp4 = opener2.open(req4)
body2 = resp4.read()
d2 = json.loads(body2) if body2 else {}
print("Via Nginx Users count:", len(d2.get("users", [])))
if not d2:
    print("EMPTY response!")
