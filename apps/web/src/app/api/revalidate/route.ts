import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_TAGS = ["catalog", "product"] as const;
type ValidTag = (typeof VALID_TAGS)[number];

function isValidTag(tag: string): tag is ValidTag {
  return (VALID_TAGS as readonly string[]).includes(tag);
}

// Simple sliding-window rate limiter: max MAX_CALLS per WINDOW_MS
const MAX_CALLS = 10;
const WINDOW_MS = 60_000;
const requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  // Evict timestamps outside the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_CALLS) {
    return true;
  }
  requestTimestamps.push(now);
  return false;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidation-secret");
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { error: "Invalid revalidation secret" },
      { status: 401 },
    );
  }

  if (isRateLimited()) {
    return NextResponse.json(
      { error: "Too many revalidation requests. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { tag, path: revalidatePathValue } = body as {
      tag?: string;
      path?: string;
    };

    if (revalidatePathValue) {
      revalidatePath(revalidatePathValue);
      return NextResponse.json({
        revalidated: true,
        path: revalidatePathValue,
        now: Date.now(),
      });
    }

    if (!tag || !isValidTag(tag)) {
      return NextResponse.json(
        {
          error: `Missing or invalid tag. Valid tags: ${VALID_TAGS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    revalidateTag(tag);

    return NextResponse.json({
      revalidated: true,
      tag,
      now: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revalidate", details: String(error) },
      { status: 500 },
    );
  }
}
