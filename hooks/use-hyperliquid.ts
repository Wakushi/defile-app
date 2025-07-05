import { useEffect, useState } from "react"
import { UserFills, UserOpenOrders } from "hyperliquid"
import { Address, isAddress } from "viem"
import { HYPERLIQUID_TESTNET_API_URL, USER } from "@/lib/constants"
import { AssetPosition, HyperliquidMarginInfo } from "@/types/hyperliquid.type"

export function useHyperliquid(user: Address) {
  const [orders, setOrders] = useState<UserOpenOrders[]>([])
  const [fills, setFills] = useState<UserFills>([])
  const [openPositions, setOpenPositions] = useState<AssetPosition[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isLoadingFills, setIsLoadingFills] = useState(false)
  const [isLoadingOpenPositions, setIsLoadingOpenPositions] = useState(false)

  useEffect(() => {
    if (!user || !isAddress(user)) return

    fetchOrders()
    fetchFills()
    fetchOpenPositions()
  }, [user])

  const fetchOpenPositions = async () => {
    setIsLoadingOpenPositions(true)
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
      setOpenPositions(data.assetPositions)
    } catch (error) {
      console.error("Failed to get asset positions:", error)
      setOpenPositions([])
    } finally {
      setIsLoadingOpenPositions(false)
    }
  }

  const fetchOrders = async () => {
    setIsLoadingOrders(true)

    try {
      const response = await fetch(`/api/hyperliquid/orders?user=${user}`)
      const data = await response.json()
      setOrders(data.orders)
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const fetchFills = async () => {
    setIsLoadingFills(true)

    try {
      const response = await fetch(`/api/hyperliquid/position?user=${user}`)
      const data = await response.json()
      setFills(data.fills)
    } catch (error) {
      console.error("Error fetching fills:", error)
    } finally {
      setIsLoadingFills(false)
    }
  }

  return {
    orders,
    fills,
    openPositions,
    isLoadingOrders,
    isLoadingFills,
    isLoadingOpenPositions,
  }
}
