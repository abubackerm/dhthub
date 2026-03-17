import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>© 2026 Dynamic Hub. All rights reserved.</span>
            <span>|</span>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Powered by Tekhive
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
