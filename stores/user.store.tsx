"use client"

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react"
import { useWallets } from "@privy-io/react-auth"
import { Address, isAddress } from "viem"
import { SupportedChainId } from "@/lib/chains"
import { HyperliquidMarginInfo } from "@/types/hyperliquid.type"
import { useCrossChainTransfer } from "@/hooks/use-cross-chain-transfer"
import { HYPERLIQUID_TESTNET_API_URL } from "@/lib/constants"

interface UserState {
  address: Address | undefined
  chainId: SupportedChainId | undefined
  balance: string
  hyperliquidBalance: string
  isLoadingBalance: boolean
  isLoadingHyperliquid: boolean
  refreshAllBalances: () => Promise<void>
}

interface UserStoreProviderProps {
  children: ReactNode
}

const UserContext = createContext<UserState | undefined>(undefined)

export function UserStoreProvider({ children }: UserStoreProviderProps) {
  const { wallets } = useWallets()
  const { getBalance } = useCrossChainTransfer()

  const [account, setAccount] = useState<Address | undefined>()
  const [sourceChain, setSourceChain] = useState<SupportedChainId | undefined>()
  const [balance, setBalance] = useState<string>("0")
  const [hyperliquidBalance, setHyperliquidBalance] = useState<string>("0")

  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false)
  const [isLoadingHyperliquid, setIsLoadingHyperliquid] =
    useState<boolean>(false)

  useEffect(() => {
    if (!wallets || !wallets.length || !wallets[0]) return

    const wallet = wallets[0]
    const chainId = wallet.chainId.split(":")[1]

    setSourceChain(Number(chainId))
    setAccount(wallet.address as Address)
    refreshAllBalances()
  }, [wallets])

  const fetchBalance = async () => {
    if (!sourceChain) return

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
    if (!account || !isAddress(account)) return

    setIsLoadingHyperliquid(true)
    try {
      const response = await fetch(HYPERLIQUID_TESTNET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: account,
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

  const userState: UserState = {
    address: account,
    chainId: sourceChain,
    balance,
    hyperliquidBalance,
    isLoadingBalance,
    isLoadingHyperliquid,
    refreshAllBalances,
  }

  return (
    <UserContext.Provider value={userState}>{children}</UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserStoreProvider")
  }
  return context
}
