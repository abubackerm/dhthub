import subprocess, json

# Sign in
result = subprocess.run(
    ["docker", "exec", "dht-postgres", "psql", "-U", "dht_admin", "-d", "dht_hub",
     "-c", "SELECT id, email, role FROM users;"],
    capture_output=True, text=True
)
print("Users in DB:")
print(result.stdout)
print(result.stderr)

# Check sessions
result2 = subprocess.run(
    ["docker", "exec", "dht-postgres", "psql", "-U", "dht_admin", "-d", "dht_hub",
     "-c", "SELECT id, user_id, created_at FROM sessions ORDER BY created_at DESC LIMIT 5;"],
    capture_output=True, text=True
)
print("Recent sessions:")
print(result2.stdout)
