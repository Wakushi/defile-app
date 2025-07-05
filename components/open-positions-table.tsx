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
  AlertTriangle,
} from "lucide-react"
import { AssetPosition } from "@/types/hyperliquid.type"

interface OpenPositionsTableProps {
  positions: AssetPosition[]
  isLoading?: boolean
}

type SortField =
  | "coin"
  | "szi"
  | "entryPx"
  | "positionValue"
  | "unrealizedPnl"
  | "returnOnEquity"
  | "marginUsed"
  | "leverage"
type SortDirection = "asc" | "desc"

export function OpenPositionsTable({
  positions,
  isLoading = false,
}: OpenPositionsTableProps) {
  const [sortField, setSortField] = useState<SortField>("coin")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [coinFilter, setCoinFilter] = useState<string>("")
  const [leverageTypeFilter, setLeverageTypeFilter] = useState<string>("")

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

  const formatPercentage = (value: string) => {
    const num = parseFloat(value) * 100
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`
  }

  const formatPnl = (pnl: string) => {
    const num = parseFloat(pnl)
    const color = num >= 0 ? "text-green-600" : "text-red-600"
    const sign = num >= 0 ? "+" : ""
    return (
      <span className={color}>
        {sign}
        {formatCurrency(pnl)}
      </span>
    )
  }

  const formatReturnOnEquity = (roe: string) => {
    const num = parseFloat(roe)
    const color = num >= 0 ? "text-green-600" : "text-red-600"
    return <span className={color}>{formatPercentage(roe)}</span>
  }

  const getPositionSide = (szi: string) => {
    const size = parseFloat(szi)
    return size > 0 ? "Long" : "Short"
  }

  const getPositionSideColor = (szi: string) => {
    const size = parseFloat(szi)
    return size > 0 ? "text-green-600" : "text-red-600"
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

  const filteredAndSortedPositions = useMemo(() => {
    let filtered = positions.filter((position) => {
      const matchesCoin =
        coinFilter === "" ||
        position.position.coin.toLowerCase().includes(coinFilter.toLowerCase())
      const matchesLeverageType =
        leverageTypeFilter === "" ||
        position.position.leverage.type === leverageTypeFilter
      return matchesCoin && matchesLeverageType
    })

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "coin":
          aValue = a.position.coin.toLowerCase()
          bValue = b.position.coin.toLowerCase()
          break
        case "szi":
          aValue = Math.abs(parseFloat(a.position.szi))
          bValue = Math.abs(parseFloat(b.position.szi))
          break
        case "entryPx":
          aValue = parseFloat(a.position.entryPx)
          bValue = parseFloat(b.position.entryPx)
          break
        case "positionValue":
          aValue = parseFloat(a.position.positionValue)
          bValue = parseFloat(b.position.positionValue)
          break
        case "unrealizedPnl":
          aValue = parseFloat(a.position.unrealizedPnl)
          bValue = parseFloat(b.position.unrealizedPnl)
          break
        case "returnOnEquity":
          aValue = parseFloat(a.position.returnOnEquity)
          bValue = parseFloat(b.position.returnOnEquity)
          break
        case "marginUsed":
          aValue = parseFloat(a.position.marginUsed)
          bValue = parseFloat(b.position.marginUsed)
          break
        case "leverage":
          aValue = a.position.leverage.value
          bValue = b.position.leverage.value
          break
        default:
          aValue = a.position.coin.toLowerCase()
          bValue = b.position.coin.toLowerCase()
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
  }, [positions, sortField, sortDirection, coinFilter, leverageTypeFilter])

  const uniqueCoins = useMemo(() => {
    return Array.from(new Set(positions.map((pos) => pos.position.coin))).sort()
  }, [positions])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading positions...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Open Positions</CardTitle>
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

            {/* Leverage Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Leverage Type
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={leverageTypeFilter === ""}
                  onCheckedChange={() => setLeverageTypeFilter("")}
                >
                  All Types
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={leverageTypeFilter === "cross"}
                  onCheckedChange={() =>
                    setLeverageTypeFilter(
                      leverageTypeFilter === "cross" ? "" : "cross"
                    )
                  }
                >
                  Cross
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={leverageTypeFilter === "isolated"}
                  onCheckedChange={() =>
                    setLeverageTypeFilter(
                      leverageTypeFilter === "isolated" ? "" : "isolated"
                    )
                  }
                >
                  Isolated
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
                    onClick={() => handleSort("szi")}
                    className="h-auto p-0 font-semibold"
                  >
                    Position {getSortIcon("szi")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("entryPx")}
                    className="h-auto p-0 font-semibold"
                  >
                    Entry Price {getSortIcon("entryPx")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("positionValue")}
                    className="h-auto p-0 font-semibold"
                  >
                    Position Value {getSortIcon("positionValue")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("unrealizedPnl")}
                    className="h-auto p-0 font-semibold"
                  >
                    Unrealized PnL {getSortIcon("unrealizedPnl")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("returnOnEquity")}
                    className="h-auto p-0 font-semibold"
                  >
                    ROE {getSortIcon("returnOnEquity")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("leverage")}
                    className="h-auto p-0 font-semibold"
                  >
                    Leverage {getSortIcon("leverage")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("marginUsed")}
                    className="h-auto p-0 font-semibold"
                  >
                    Margin Used {getSortIcon("marginUsed")}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Liquidation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPositions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-gray-500 py-8"
                  >
                    No open positions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedPositions.map((position, index) => (
                  <TableRow key={`${position.position.coin}-${index}`}>
                    <TableCell className="font-medium">
                      {position.position.coin}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {parseFloat(position.position.szi) > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span
                          className={getPositionSideColor(
                            position.position.szi
                          )}
                        >
                          {getPositionSide(position.position.szi)}
                        </span>
                        <span className="font-mono text-sm">
                          {formatNumber(
                            Math.abs(
                              parseFloat(position.position.szi)
                            ).toString(),
                            4
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(position.position.entryPx)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(position.position.positionValue)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatPnl(position.position.unrealizedPnl)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatReturnOnEquity(position.position.returnOnEquity)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {position.position.leverage.type}
                        </span>
                        <span className="font-mono text-sm">
                          {position.position.leverage.value}x
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(position.position.marginUsed)}
                    </TableCell>
                    <TableCell className="text-center">
                      {position.position.liquidationPx ? (
                        <span className="font-mono text-sm text-red-600">
                          {formatCurrency(position.position.liquidationPx)}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center opacity-50">
                          N/A
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredAndSortedPositions.length} of {positions.length}{" "}
          positions
        </div>
      </CardContent>
    </Card>
  )
}
