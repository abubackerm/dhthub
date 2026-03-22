1. ADD Content-Type passthrough (IMPORTANT)

Right now you only set cache header.

👉 You MUST forward the original content type.

✅ Add this in proxy response
return new Response(response.body, {
  headers: {
    "Content-Type": response.headers.get("content-type") || "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
  },
});
❗ Why this matters

Without it:

PNG may render incorrectly ❌
WebP may fail ❌
Browsers may mis-handle images ❌
⚠️ 2. ADD 404 fallback (VERY IMPORTANT)

Currently missing.

✅ Add this before returning response
if (!response.ok) {
  return new Response("Image not found", { status: 404 });
}
❗ Why
prevents broken streams
avoids weird frontend errors
helps debugging
🚀 3.  STRONGLY RECOMMENDED
Add request passthrough headers
const response = await fetch(seaweedfsUrl, {
  headers: {
    Accept: request.headers.get("accept") || "image/*",
  },
});

👉 Ensures correct format negotiation (important later for WebP)

🔥 Final Updated Proxy (BEST VERSION)
if (pathname.startsWith("/product-images/")) {
  const storageUrl =
    process.env.SEAWEDFS_FILER_URL || "http://localhost:8888";

  const objectKey = pathname.startsWith("/")
    ? pathname.slice(1)
    : pathname;

  const seaweedfsUrl = `${storageUrl}/${objectKey}`;

  const response = await fetch(seaweedfsUrl, {
    headers: {
      Accept: request.headers.get("accept") || "image/*",
    },
  });

  if (!response.ok) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}