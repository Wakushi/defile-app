"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-3xl text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
        HyPortal
      </h1>
      <h2 className="text-2xl font-medium text-gray-600 dark:text-gray-400 mb-2">
        The omnichain gateway to Hyperliquid
      </h2>
      <p className="text-lg text-gray-700 dark:text-gray-300  mb-12">
        Trade perps on Hyperliquid using liquidity from any chain
      </p>
      <div className="flex justify-center">
        <Link href="/trading">
          <Button size="lg">Launch App</Button>
        </Link>
      </div>
    </div>
  )
}
