import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          DeFile - Omnichain Trading
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Trade perpetuals on Hyperliquid from any chain with seamless
          cross-chain UX
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/trading">
            <Button size="lg">Start Trading</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
