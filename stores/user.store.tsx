"use client"

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react"
import { useWallets } from "@privy-io/react-auth"
import { Address, formatUnits, isAddress } from "viem"
import { CHAIN_IDS_TO_USDC_ADDRESSES, SupportedChainId } from "@/lib/chains"
import { HyperliquidMarginInfo } from "@/types/hyperliquid.type"
import {
  DEFAULT_USDC_DECIMALS,
  HYPERLIQUID_TESTNET_API_URL,
} from "@/lib/constants"
import { getPublicClient } from "@/lib/chain-utils"

interface UserState {
  address: Address | undefined
  chainId: SupportedChainId | undefined
  balance: string
  hyperliquidBalance: string
  isLoadingBalance: boolean
  isLoadingHyperliquid: boolean
  refreshAllBalances: (chainId: SupportedChainId) => Promise<void>
}

interface UserStoreProviderProps {
  children: ReactNode
}

const UserContext = createContext<UserState | undefined>(undefined)

export function UserStoreProvider({ children }: UserStoreProviderProps) {
  const { wallets } = useWallets()

  const [account, setAccount] = useState<Address | undefined>()
  const [sourceChain, setSourceChain] = useState<SupportedChainId | undefined>()
  const [balance, setBalance] = useState<string>("0")
  const [hyperliquidBalance, setHyperliquidBalance] = useState<string>("0")

  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false)
  const [isLoadingHyperliquid, setIsLoadingHyperliquid] =
    useState<boolean>(false)

  useEffect(() => {
    if (!wallets || !wallets.length || !wallets[0]) return

    const injected = wallets.find(
      (wallet) => wallet.connectorType === "injected"
    )
    const wallet = injected || wallets[0]
    const chainId = Number(wallet.chainId.split(":")[1])

    setSourceChain(chainId)
    setAccount(wallet.address as Address)
    refreshAllBalances(chainId)
  }, [wallets])

  const fetchBalance = async (chainId: SupportedChainId) => {
    if (!chainId || !wallets || !wallets.length || !wallets[0]) return

    setIsLoadingBalance(true)
    try {
      const balance = await getBalance(chainId)
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
      const response = await fetch(`${HYPERLIQUID_TESTNET_API_URL}/info`, {
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
      setHyperliquidBalance(data.marginSummary.accountValue)
    } catch (error) {
      console.error("Failed to get Hyperliquid balance:", error)
      setHyperliquidBalance("0")
    } finally {
      setIsLoadingHyperliquid(false)
    }
  }

  const refreshAllBalances = async (chainId: SupportedChainId) => {
    await Promise.all([fetchBalance(chainId), fetchHyperliquidBalance()])
  }

  const getBalance = async (chainId: SupportedChainId) => {
    if (!account) {
      return "0"
    }

    const publicClient = getPublicClient(chainId)

    const balance = await publicClient.readContract({
      address: CHAIN_IDS_TO_USDC_ADDRESSES[chainId] as `0x${string}`,
      abi: [
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [account],
    })

    const formattedBalance = formatUnits(balance, DEFAULT_USDC_DECIMALS)
    return formattedBalance
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
