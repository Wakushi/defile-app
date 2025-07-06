"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowUpDown,
  Filter,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  X,
  Clock,
} from "lucide-react"
import { UserOpenOrder } from "hyperliquid"

interface OpenOrdersTableProps {
  orders: UserOpenOrder[]
  isLoading?: boolean
  onCancelOrder: (coin: string, orderId: number) => void
}

type SortField =
  | "coin"
  | "side"
  | "size"
  | "price"
  | "orderValue"
  | "orderId"
  | "timestamp"
type SortDirection = "asc" | "desc"

export function OpenOrdersTable({
  orders,
  isLoading = false,
  onCancelOrder,
}: OpenOrdersTableProps) {
  const [sortField, setSortField] = useState<SortField>("coin")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [coinFilter, setCoinFilter] = useState<string>("")
  const [sideFilter, setSideFilter] = useState<string>("")

  const formatNumber = (value: string, decimals: number = 2) => {
    const num = parseFloat(value)
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num)
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getOrderSide = (side: string) => {
    return side === "buy" ? "Buy" : "Sell"
  }

  const getOrderSideColor = (side: string) => {
    return side === "buy" ? "text-green-600" : "text-red-600"
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
  }

  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return []

    let filtered = orders.filter((order) => {
      const matchesCoin =
        coinFilter === "" ||
        order.coin.toLowerCase().includes(coinFilter.toLowerCase())
      const matchesSide =
        sideFilter === "" ||
        (sideFilter === "buy" && order.side === "buy") ||
        (sideFilter === "sell" && order.side === "sell")
      return matchesCoin && matchesSide
    })

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "coin":
          aValue = a.coin.toLowerCase()
          bValue = b.coin.toLowerCase()
          break
        case "side":
          aValue = a.side === "buy" ? "buy" : "sell"
          bValue = b.side === "buy" ? "buy" : "sell"
          break
        case "size":
          aValue = Math.abs(parseFloat(a.sz))
          bValue = Math.abs(parseFloat(b.sz))
          break
        case "price":
          aValue = parseFloat(a.limitPx)
          bValue = parseFloat(b.limitPx)
          break
        case "orderValue":
          aValue = Math.abs(parseFloat(a.sz) * parseFloat(a.limitPx))
          bValue = Math.abs(parseFloat(b.sz) * parseFloat(b.limitPx))
          break
        case "orderId":
          aValue = a.oid
          bValue = b.oid
          break
        case "timestamp":
          aValue = a.timestamp || 0
          bValue = b.timestamp || 0
          break
        default:
          aValue = a.coin.toLowerCase()
          bValue = b.coin.toLowerCase()
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1
      }
      return 0
    })

    return filtered
  }, [orders, sortField, sortDirection, coinFilter, sideFilter])

  const uniqueCoins = useMemo(() => {
    return Array.from(new Set(orders.map((order) => order.coin))).sort()
  }, [orders])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading orders...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Open Orders</CardTitle>
          <div className="flex items-center gap-2">
            {/* Coin Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Asset
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={coinFilter === ""}
                  onCheckedChange={() => setCoinFilter("")}
                >
                  All Assets
                </DropdownMenuCheckboxItem>
                {uniqueCoins.map((coin) => (
                  <DropdownMenuCheckboxItem
                    key={coin}
                    checked={coinFilter === coin}
                    onCheckedChange={() =>
                      setCoinFilter(coinFilter === coin ? "" : coin)
                    }
                  >
                    {coin}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Side Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Side
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={sideFilter === ""}
                  onCheckedChange={() => setSideFilter("")}
                >
                  All Sides
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sideFilter === "buy"}
                  onCheckedChange={() =>
                    setSideFilter(sideFilter === "buy" ? "" : "buy")
                  }
                >
                  Buy
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sideFilter === "sell"}
                  onCheckedChange={() =>
                    setSideFilter(sideFilter === "sell" ? "" : "sell")
                  }
                >
                  Sell
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("coin")}
                    className="h-auto p-0 font-semibold"
                  >
                    Asset {getSortIcon("coin")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("side")}
                    className="h-auto p-0 font-semibold"
                  >
                    Side {getSortIcon("side")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("size")}
                    className="h-auto p-0 font-semibold"
                  >
                    Size {getSortIcon("size")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("price")}
                    className="h-auto p-0 font-semibold"
                  >
                    Price {getSortIcon("price")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("orderValue")}
                    className="h-auto p-0 font-semibold"
                  >
                    Order Value {getSortIcon("orderValue")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("orderId")}
                    className="h-auto p-0 font-semibold"
                  >
                    Order ID {getSortIcon("orderId")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("timestamp")}
                    className="h-auto p-0 font-semibold"
                  >
                    Time {getSortIcon("timestamp")}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 py-8"
                  >
                    No open orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedOrders.map((order, index) => (
                  <TableRow key={`${order.coin}-${order.oid}-${index}`}>
                    <TableCell className="font-medium">{order.coin}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {order.side === "buy" ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={getOrderSideColor(order.side)}>
                          {getOrderSide(order.side)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatNumber(
                        Math.abs(parseFloat(order.sz)).toString(),
                        4
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(order.limitPx)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(
                        (
                          Math.abs(parseFloat(order.sz)) *
                          parseFloat(order.limitPx)
                        ).toString()
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {order.oid}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {order.timestamp
                            ? formatTimestamp(order.timestamp)
                            : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCancelOrder(order.coin, order.oid)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredAndSortedOrders.length} of {orders.length} orders
        </div>
      </CardContent>
    </Card>
  )
}
