import re, os, sys

directory = sys.argv[1] if len(sys.argv) > 1 else "/home/ubuntu/dht-temp/apps/web/.next/static/chunks"

for f in sorted(os.listdir(directory)):
    if not f.endswith(".js"):
        continue
    fp = os.path.join(directory, f)
    try:
        with open(fp, "r", errors="ignore") as fh:
            content = fh.read(10000)
        for m in re.finditer(r"https?://[^\s\"']+", content):
            u = m.group()
            if "localhost" in u or "51.79" in u or "api" in u.lower():
                print(f"{f}: {u}")
    except Exception as e:
        print(f"{f}: ERROR {e}")
