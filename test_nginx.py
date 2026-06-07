import urllib.request, json
from http.cookiejar import CookieJar

cj = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Sign in via Nginx proxy
url = "http://51.79.251.154:8088/api/auth/sign-in/email"
data = json.dumps({"email": "supertekadmin@dhthub.com", "password": "Tekdht@2026"}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print("Sign-in through Nginx: SUCCESS")
    print("Token:", result.get("token", "")[:20])

    # Now try listUsers through the admin API
    url2 = "http://51.79.251.154:8088/api/auth/admin/list-users"
    req2 = urllib.request.Request(url2)
    for cookie in cj:
        req2.add_unredirected_header("Cookie", "session_token=" + cookie.value)
        break
    try:
        resp2 = urllib.request.urlopen(req2)
        body = json.loads(resp2.read())
        users = body.get("users", body.get("data", body))
        if isinstance(users, list):
            print(f"List users: {len(users)} users found")
            for u in users[:5]:
                print(f"  - {u.get('name')} ({u.get('email')})")
        else:
            print("Response:", json.dumps(body, indent=2)[:300])
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"List users FAILED: {e.code}")
        print(f"Error: {err_body[:200]}")
except urllib.error.HTTPError as e:
    err_body = e.read().decode()
    print(f"Sign-in FAILED: {e.code} {err_body[:200]}")
