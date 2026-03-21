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
  "/errors",
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  try {
    const res = await fetch(`${apiUrl}/api/auth/get-session`, {
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
    try {
      const storageUrl = process.env.SEAWEDFS_FILER_URL || "http://localhost:8888";
      const bucketName = "catalog";
      const objectKey = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      
      // Construct SeaweedFS Filer URL (HTTP endpoint, no auth required)
      const seaweedfsUrl = `${storageUrl}/buckets/${bucketName}/${objectKey}`;
      
      // Fetch the image from SeaweedFS and proxy it
      // Only forward necessary headers, not cookies/auth headers that SeaweedFS rejects
      const response = await fetch(seaweedfsUrl, {
        headers: {
          'Accept': request.headers.get('accept') || 'image/*',
        },
      });
      
      if (!response.ok) {
        return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
      }
      
      const imageBuffer = await response.arrayBuffer();
      
      // Get content type from response or default to image/jpeg
      const contentType = response.headers.get("content-type") || "image/jpeg";
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000", // 1 year
        },
      });
    } catch (error) {
      console.error("Error proxying SeaweedFS image:", error);
      return new NextResponse("Failed to load image", { status: 500 });
    }
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

  if (!sessionData) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAdminOnlyRoute(pathname)) {
    const role = sessionData.user?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/errors/forbidden", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
