# Icon Import Best Practices

## Overview

This project uses `lucide-react` for icons with automatic tree-shaking enabled via Next.js experimental optimization.

## Configuration

Next.js is configured to optimize lucide-react imports in `apps/web/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  // ...
};
```

## Import Pattern

✅ **CORRECT** - Use named imports (tree-shaking enabled):

```typescript
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
```

This is the recommended approach because:
- Next.js automatically tree-shakes unused icons
- Cleaner, more readable code
- Better IDE autocomplete support
- No performance penalty

❌ **AVOID** - Don't use individual icon imports:

```typescript
// Unnecessary verbosity, no benefit over named imports
import { Mail } from 'lucide-react/Mail';
import { Phone } from 'lucide-react/Phone';
```

## Usage Example

```typescript
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export function ContactInfo() {
  return (
    <div>
      <Mail className="w-6 h-6" />
      <Phone className="w-6 h-6" />
      <MapPin className="w-6 h-6" />
      <Clock className="w-6 h-6" />
    </div>
  );
}
```

## Performance Notes

- Tree-shaking removes unused icons from the bundle automatically
- Each icon is ~1-2KB gzipped
- Only imported icons are included in production builds
- No need to manually optimize imports

## Icon Search

Browse available icons at: https://lucide.dev/icons

## Version

Current version: lucide-react ^0.562.0

This version fully supports ES modules and tree-shaking.
