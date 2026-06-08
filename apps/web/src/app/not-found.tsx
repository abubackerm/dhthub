import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--dht-dark) px-4">
      <div className="text-center">
        <h1 className="text-[10rem] font-extrabold leading-none tracking-tighter text-(--dht-red)">
          404
        </h1>
        <p className="mt-2 text-xl font-medium text-white/90">
          The page you are looking for doesn&apos;t exist
        </p>
        <p className="mt-2 text-sm text-white/50">
          It may have been moved or deleted, or the URL might be incorrect.
        </p>
        <Button
          asChild
          className="mt-8 bg-(--dht-red) text-white hover:bg-(--dht-red-hover)"
          size="lg"
        >
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
