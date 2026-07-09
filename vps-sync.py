import json
import sys

target = sys.argv[1]

if target == 'package.json':
    with open('package.json') as f:
        pkg = json.load(f)
    pkg['scripts']['build'] = 'dotenv -e .env -- turbo run build'
    pkg['scripts']['build:web'] = 'dotenv -e .env -- pnpm --filter web build'
    pkg['scripts']['build:api'] = 'dotenv -e .env -- pnpm --filter api build'
    with open('package.json', 'w') as f:
        json.dump(pkg, f, indent=2)
    print('package.json updated')
elif target == 'turbo.json':
    with open('turbo.json') as f:
        turbo = json.load(f)
    turbo['tasks']['build'].pop('dotEnv', None)
    turbo['tasks']['build']['env'] = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WEB_URL']
    turbo['tasks']['build']['inputs'] = ['.env']
    with open('turbo.json', 'w') as f:
        json.dump(turbo, f, indent=2)
    print('turbo.json updated')
