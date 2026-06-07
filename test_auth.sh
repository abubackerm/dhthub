#!/bin/bash
curl -s -c /tmp/ba_cookies.txt -b /tmp/ba_cookies.txt -X POST 'http://51.79.251.154:8088/api/auth/sign-in/email' -H 'Content-Type: application/json' -d '{"email":"supertekadmin@dhthub.com","password":"Tekdht@2026"}' > /dev/null
echo "---LIST---"
curl -s -b /tmp/ba_cookies.txt 'http://51.79.251.154:8088/api/auth/admin/list-users?limit=100' | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Total:', d.get('total', '?'))
print('Users:', len(d.get('users', [])))
"
