import { useEffect, useState } from "react"
import { UserFills, UserOpenOrders } from "hyperliquid"
import { Address, isAddress } from "viem"
import { HYPERLIQUID_TESTNET_API_URL } from "@/lib/constants"
import { AssetPosition, HyperliquidMarginInfo } from "@/types/hyperliquid.type"

export function useHyperliquid(user: Address | undefined) {
  const [orders, setOrders] = useState<UserOpenOrders[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  const [fills, setFills] = useState<UserFills>([])
  const [isLoadingFills, setIsLoadingFills] = useState(false)

  const [openPositions, setOpenPositions] = useState<AssetPosition[]>([])
  const [isLoadingOpenPositions, setIsLoadingOpenPositions] = useState(false)

  const [perpsAssets, setPerpsAssets] = useState<string[]>([])
  const [isLoadingPerpsAssets, setIsLoadingPerpsAssets] = useState(false)

  useEffect(() => {
    if (!user || !isAddress(user)) return

    fetchOrders()
    fetchFills()
    fetchOpenPositions()
  }, [user])

  useEffect(() => {
    fetchPerpsAssets()
  }, [])

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
          user,
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

  const fetchPerpsAssets = async () => {
    setIsLoadingPerpsAssets(true)

    try {
      const response = await fetch(`/api/hyperliquid/assets`)
      const data = await response.json()
      setPerpsAssets(data.assets)
    } catch (error) {
      console.error("Error fetching perps assets:", error)
    } finally {
      setIsLoadingPerpsAssets(false)
    }
  }

  return {
    orders,
    fills,
    perpsAssets,
    openPositions,
    isLoadingOrders,
    isLoadingFills,
    isLoadingOpenPositions,
    isLoadingPerpsAssets,
  }
}
