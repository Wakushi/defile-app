import { useEffect, useState } from "react"
import { useCrossChainTransfer } from "@/hooks/use-cross-chain-transfer"
import { SupportedChainId } from "@/lib/chains"
import { HyperliquidMarginInfo } from "@/types/hyperliquid.type"

const HYPERLIQUID_TESTNET_API_URL = "https://api.hyperliquid-testnet.xyz/info"
const USER = "0x4206730E2C2281F4dF24c0e588F6C8f5dBAd03BA"

interface UseBalancesReturn {
  balance: string
  hyperliquidBalance: string
  isLoadingBalance: boolean
  isLoadingHyperliquid: boolean
  fetchBalance: () => Promise<void>
  fetchHyperliquidBalance: () => Promise<void>
  refreshAllBalances: () => Promise<void>
}

export function useBalances(sourceChain: SupportedChainId): UseBalancesReturn {
  const { getBalance } = useCrossChainTransfer()

  const [balance, setBalance] = useState<string>("0")
  const [hyperliquidBalance, setHyperliquidBalance] = useState<string>("0")
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false)
  const [isLoadingHyperliquid, setIsLoadingHyperliquid] =
    useState<boolean>(false)

  const fetchBalance = async () => {
    setIsLoadingBalance(true)
    try {
      const balance = await getBalance(sourceChain)
      setBalance(balance)
    } catch (error) {
      console.error("Failed to get balance:", error)
      setBalance("0")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const fetchHyperliquidBalance = async () => {
    setIsLoadingHyperliquid(true)
    try {
      const response = await fetch(HYPERLIQUID_TESTNET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: USER,
        }),
      })

      const data: HyperliquidMarginInfo = await response.json()
      setHyperliquidBalance(data.marginSummary.totalRawUsd)
    } catch (error) {
      console.error("Failed to get Hyperliquid balance:", error)
      setHyperliquidBalance("0")
    } finally {
      setIsLoadingHyperliquid(false)
    }
  }

  const refreshAllBalances = async () => {
    await Promise.all([fetchBalance(), fetchHyperliquidBalance()])
  }

  useEffect(() => {
    refreshAllBalances()
  }, [sourceChain])

  return {
    balance,
    hyperliquidBalance,
    isLoadingBalance,
    isLoadingHyperliquid,
    fetchBalance,
    fetchHyperliquidBalance,
    refreshAllBalances,
  }
}
