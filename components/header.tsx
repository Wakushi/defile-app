"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  Wallet,
  TrendingUp,
  LogOut,
  LogIn,
  GalleryHorizontalEnd,
} from "lucide-react"
import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth"
import { useRouter, usePathname } from "next/navigation"
import { useUser } from "@/stores/user.store"
import { getChainName } from "@/lib/chains"

export function Header() {
  const { ready, authenticated } = usePrivy()
  const pathname = usePathname()
  const router = useRouter()

  const {
    address,
    balance,
    hyperliquidBalance,
    isLoadingBalance,
    isLoadingHyperliquid,
    refreshAllBalances,
    chainId,
    reset,
  } = useUser()

  const { login } = useLogin({
    onComplete: () => router.push("/trading"),
  })

  const { logout } = useLogout({
    onSuccess: () => {
      reset()
      router.push("/")
    },
  })

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (isNaN(num)) return "0.00"
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const formatAddress = (address?: string) => {
    if (!address) return "No wallet"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const { totalMarginUsed, accountValue } = hyperliquidBalance

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/50 backdrop-blur-sm dark:bg-gray-950">
      <nav>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className={`flex items-center gap-2 text-xl font-bold ${
                pathname === "/"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              <GalleryHorizontalEnd className="w-5 h-5" />
              HyPortal
            </Link>

            {!authenticated ? (
              <Button onClick={() => login()}>
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/trading">
                  <Button
                    variant={pathname === "/trading" ? "default" : "outline"}
                    className={
                      pathname === "/trading"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : ""
                    }
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Trading
                  </Button>
                </Link>

                <Link href="/deposit">
                  <Button
                    variant={pathname === "/deposit" ? "default" : "outline"}
                    className={
                      pathname === "/deposit"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : ""
                    }
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                </Link>

                <div className="flex items-center gap-3 ml-6 pl-6 border-l border-gray-200 dark:border-gray-700">
                  {/* Wallet balance */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
                      <Wallet className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {chainId ? getChainName(chainId) : "Unknown Chain"}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${formatBalance(balance)}
                      </p>
                    </div>
                  </div>

                  {/* HL balance */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Hyperliquid
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        $
                        {formatBalance(
                          (
                            Number(accountValue) - Number(totalMarginUsed)
                          ).toFixed(2)
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Refresh */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshAllBalances(chainId as number)}
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

                {/* Address */}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatAddress(address)}
                </span>

                {/* Logout */}
                <Button onClick={() => logout()} variant="outline">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
