"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useBalances } from "@/hooks/use-balances"
import { SupportedChainId } from "@/lib/chains"
import { useState } from "react"
import { RefreshCw, Wallet, TrendingUp } from "lucide-react"

export function Header() {
  const [sourceChain, setSourceChain] = useState<SupportedChainId>(
    SupportedChainId.BASE_SEPOLIA
  )

  const {
    balance,
    hyperliquidBalance,
    isLoadingBalance,
    isLoadingHyperliquid,
    refreshAllBalances,
  } = useBalances(sourceChain)

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (isNaN(num)) return "0.00"
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getChainName = (chainId: SupportedChainId) => {
    switch (chainId) {
      case SupportedChainId.ETH_SEPOLIA:
        return "Sepolia"
      case SupportedChainId.BASE_SEPOLIA:
        return "Base"
      case SupportedChainId.ARBITRUM_SEPOLIA:
        return "Arbitrum"
      default:
        return "Unknown"
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/50 backdrop-blur-sm dark:bg-gray-950">
      <nav>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              DeFile
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/deposit">
                <Button variant="outline">Deposit</Button>
              </Link>
              <Link href="/trading">
                <Button variant="outline">Trading</Button>
              </Link>

              {/* Balance Display */}
              <div className="flex items-center gap-3 ml-6 pl-6 border-l border-gray-200 dark:border-gray-700">
                {/* Source Chain Balance */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                    <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getChainName(sourceChain)}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${formatBalance(balance)}
                    </p>
                  </div>
                </div>

                {/* Hyperliquid Balance */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hyperliquid
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${formatBalance(hyperliquidBalance)}
                    </p>
                  </div>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshAllBalances}
                  disabled={isLoadingBalance || isLoadingHyperliquid}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <RefreshCw
                    className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${
                      isLoadingBalance || isLoadingHyperliquid
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
