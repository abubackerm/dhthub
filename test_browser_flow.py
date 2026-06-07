import requests, json

s = requests.Session()

# Sign in through Nginx
r = s.post('http://51.79.251.154:8088/api/auth/sign-in/email',
    json={'email': 'supertekadmin@dhthub.com', 'password': 'Tekdht@2026'},
    headers={'Origin': 'http://51.79.251.154:8088'})
print('=== SIGN IN ===')
print('Status:', r.status_code)
print('Body len:', len(r.text))
print('User:', r.json().get('user',{}).get('email'))
set_cookie = r.headers.get('Set-Cookie','')
print('Set-Cookie:', set_cookie[:120] if set_cookie else 'NONE')

# Get session
r2 = s.get('http://51.79.251.154:8088/api/auth/get-session',
    headers={'Origin': 'http://51.79.251.154:8088'})
print('\n=== GET SESSION ===')
print('Status:', r2.status_code)
print('Body:', r2.text[:100] if r2.text else 'EMPTY')

# List users
r3 = s.get('http://51.79.251.154:8088/api/auth/admin/list-users?limit=100',
    headers={'Origin': 'http://51.79.251.154:8088'})
print('\n=== LIST USERS ===')
print('Status:', r3.status_code)
print('Body len:', len(r3.text))
if r3.text:
    d3 = json.loads(r3.text)
    print('Count:', len(d3.get('users',[])))
else:
    print('EMPTY!')
    print('Request headers cookie:', s.cookies.get_dict())
    print('Response headers:', dict(r3.headers))
