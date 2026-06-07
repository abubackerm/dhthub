import urllib.request, json
from http.cookiejar import CookieJar

cj = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Sign in through Nginx
signin_data = json.dumps({"email": "supertekadmin@dhthub.com", "password": "Tekdht@2026"}).encode()
req = urllib.request.Request("http://51.79.251.154:8088/api/auth/sign-in/email", data=signin_data,
    headers={"Content-Type": "application/json", "Origin": "http://51.79.251.154:8088"})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print("Sign in role:", result.get("user", {}).get("role"))
print("Token:", result.get("token", "")[:20])

# Now list users
req2 = urllib.request.Request("http://51.79.251.154:8088/api/auth/admin/list-users?limit=100",
    headers={"Origin": "http://51.79.251.154:8088"})
resp2 = opener.open(req2)
body = resp2.read()
body_text = body.decode() if body else "EMPTY"
print("List users status:", resp2.status, "length:", len(body))
if body_text.startswith("{"):
    d = json.loads(body_text)
    print("Users count:", len(d.get("users", [])))
    print("First user:", d.get("users", [{}])[0].get("name"))
else:
    print("Body:", body_text[:100])
