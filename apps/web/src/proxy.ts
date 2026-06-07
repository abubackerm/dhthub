import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/sign-in",
  "/sign-in-2",
  "/sign-in-3",
  "/sign-up",
  "/sign-up-2",
  "/sign-up-3",
  "/forgot-password",
  "/forgot-password-2",
  "/forgot-password-3",
  "/reset-password",
  "/landing",
  "/products",
  "/contact",
  "/about",
  "/cart",
  "/errors",
  "/privacy-policy",
  "/terms",
];

const adminOnlyRoutes = ["/dhthub-admin", "/users", "/dashboard-2"];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAdminOnlyRoute(pathname: string): boolean {
  return adminOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

async function getSession(request: NextRequest) {
  // Use direct internal URL for server-side session check (avoid Nginx loop)
  const sessionApiUrl = process.env.INTERNAL_API_URL || "http://localhost:3010";
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  try {
    const res = await fetch(`${sessionApiUrl}/api/auth/get-session`, {
      method: "GET",
      headers: { cookie },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.session) return null;

    return data;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proxy SeaweedFS images to Next.js frontend
  if (pathname.startsWith("/product-images/")) {
    const storageUrl = process.env.SEAWEDFS_FILER_URL || "http://localhost:8888";
    const s3Port = process.env.SEAWEDFS_S3_PORT || "8333";
    const s3Url = `http://localhost:${s3Port}`;

    const objectKey = pathname.startsWith("/")
      ? pathname.slice(1)
      : pathname;

    console.log(`[Proxy] Serving image: ${pathname}`);
    console.log(`[Proxy] Object key: ${objectKey}`);

    // Try multiple URL patterns in order:
    const urlsToTry = [
      // 1. Direct FILER path (most common)
      `${storageUrl}/${objectKey}`,
      // 2. FILER bucket path
      `${storageUrl}/buckets/catalog/${objectKey}`,
      // 3. S3 API path (as fallback)
      `${s3Url}/catalog/${objectKey}`,
    ];

    console.log(`[Proxy] Trying URLs: ${urlsToTry.join(', ')}`);

    for (const imageUrl of urlsToTry) {
      try {
        const response = await fetch(imageUrl, {
          headers: {
            Accept: request.headers.get("accept") || "image/*",
          },
        });

        if (response.ok) {
          console.log(`[Proxy] Image found at: ${imageUrl}`);
          return new Response(response.body, {
            headers: {
              "Content-Type":
                response.headers.get("content-type") || "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } else {
          console.log(`[Proxy] Image not found at: ${imageUrl} (status: ${response.status})`);
        }
      } catch (error) {
        console.log(`[Proxy] Error fetching from ${imageUrl}:`, error instanceof Error ? error.message : String(error));
        // Try next URL
        continue;
      }
    }

    // All URLs failed
    console.error(`[Proxy] All URLs failed for: ${pathname}`);
    return new Response("Image not found", { status: 404 });
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionData = await getSession(request);

  if (isAdminOnlyRoute(pathname)) {
    if (!sessionData) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const role = sessionData.user?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/errors/forbidden", request.url));
    }
  }

  if (!sessionData) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
