"""Test the exact browser auth flow through Nginx"""
import http.client, json, urllib.parse

def test():
    conn = http.client.HTTPConnection("51.79.251.154", 8088)
    
    # 1. Sign in
    body = json.dumps({"email": "supertekadmin@dhthub.com", "password": "Tekdht@2026"})
    headers = {
        "Content-Type": "application/json",
        "Origin": "http://51.79.251.154:8088",
        "Referer": "http://51.79.251.154:8088/sign-in",
    }
    conn.request("POST", "/api/auth/sign-in/email", body=body, headers=headers)
    resp = conn.getresponse()
    print("Sign-in status:", resp.status)
    set_cookie = resp.headers.get("Set-Cookie", "")
    print("Set-Cookie:", set_cookie[:100] if set_cookie else "NONE!")
    resp.read()
    
    if not set_cookie:
        print("NO COOKIE SET - this is the problem!")
        print("Sign-in response headers:", dict(resp.headers))
        return
    
    # Parse cookie
    cookie_val = set_cookie.split(";")[0]
    print("Cookie:", cookie_val)
    
    # 2. Get session
    headers2 = {
        "Origin": "http://51.79.251.154:8088",
        "Cookie": cookie_val,
    }
    conn.request("GET", "/api/auth/get-session", headers=headers2)
    resp2 = conn.getresponse()
    data2 = json.loads(resp2.read().decode())
    print("\nGet-session user:", data2.get("user",{}).get("email"), "role:", data2.get("user",{}).get("role"))
    
    # 3. List users
    conn.request("GET", "/api/auth/admin/list-users?limit=100", headers=headers2)
    resp3 = conn.getresponse()
    body3 = resp3.read()
    print("\nList-users status:", resp3.status, "size:", len(body3))
    if body3:
        d3 = json.loads(body3.decode())
        print("Users count:", len(d3.get("users",[])))
    else:
        print("EMPTY BODY!")
    
if __name__ == "__main__":
    test()
