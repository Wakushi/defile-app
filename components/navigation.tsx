import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navigation() {
  return (
    <nav className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            DeFile
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/trading">
              <Button variant="outline">Trading</Button>
            </Link>
            <Button>Connect Wallet</Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
