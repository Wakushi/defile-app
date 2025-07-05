import { useEffect, useState } from "react"
import { UserFills, UserOpenOrders } from "hyperliquid"
import { Address, isAddress } from "viem"

export function useHyperliquid(user: Address) {
  const [orders, setOrders] = useState<UserOpenOrders>([])
  const [fills, setFills] = useState<UserFills>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isLoadingFills, setIsLoadingFills] = useState(false)

  useEffect(() => {
    if (!user || isAddress(user)) return

    fetchOrders()
    fetchFills()
  }, [user])

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

  return { orders, fills, isLoadingOrders, isLoadingFills }
}
