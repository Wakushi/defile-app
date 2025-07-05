"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useBalances } from "@/hooks/use-balances"
import { SupportedChainId } from "@/lib/chains"
import BalanceDisplay from "@/components/balance-display"

const tradeFormSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  size: z.number().positive("Size must be positive"),
  side: z.enum(["buy", "sell"]),
  price: z.number().optional(),
})

type TradeFormData = z.infer<typeof tradeFormSchema>

// Need to fetch this from the API
const tradingPairs = [
  { value: "ETH-PERP", label: "ETH Perpetual" },
  { value: "BTC-PERP", label: "BTC Perpetual" },
  { value: "SOL-PERP", label: "SOL Perpetual" },
  { value: "MATIC-PERP", label: "MATIC Perpetual" },
  { value: "AVAX-PERP", label: "AVAX Perpetual" },
]

export default function TradingPage() {
  const [sourceChain, setSourceChain] = useState<SupportedChainId>(
    SupportedChainId.BASE_SEPOLIA
  )
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const {
    balance,
    hyperliquidBalance,
    isLoadingBalance,
    isLoadingHyperliquid,
    fetchBalance,
    fetchHyperliquidBalance,
  } = useBalances(sourceChain)

  const formMethods = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      asset: tradingPairs[0].value,
      side: "buy",
      size: 0,
      price: undefined,
    },
    mode: "onChange",
  })

  const { control, watch, handleSubmit } = formMethods

  const watchedValues = watch()

  const onSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true)
    console.log("Trade form data:", data)
    // TODO: Implement trade submission logic
    setTimeout(() => {
      setIsSubmitting(false)
    }, 1000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Perpetual Trading
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Open leveraged positions on Hyperliquid from any chain
        </p>
      </div>

      <div className="mb-6">
        <BalanceDisplay
          balance={balance}
          hyperliquidBalance={hyperliquidBalance}
          sourceChain={sourceChain}
          onRefresh={fetchBalance}
          onRefreshHyperliquid={fetchHyperliquidBalance}
        />
      </div>

      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Position</CardTitle>
              <CardDescription>
                Select your trading pair and enter position details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Selection */}
              <FormField
                control={control}
                name="asset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Pair</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a trading pair" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tradingPairs.map((pair) => (
                          <SelectItem key={pair.value} value={pair.value}>
                            {pair.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Side Selection */}
              <FormField
                control={control}
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Side</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            field.value === "buy" ? "default" : "outline"
                          }
                          onClick={() => field.onChange("buy")}
                          className="flex-1"
                        >
                          Buy / Long
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "sell" ? "default" : "outline"
                          }
                          onClick={() => field.onChange("sell")}
                          className="flex-1"
                        >
                          Sell / Short
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Size Input */}
              <FormField
                control={control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price Input (Optional) */}
              <FormField
                control={control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Leave empty for market order"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value ? parseFloat(value) : undefined)
                        }}
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">
                      Leave empty to place a market order
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault()
                  handleSubmit(onSubmit)(e)
                }}
              >
                {isSubmitting ? "Submitting..." : "Open Position"}
              </Button>
            </CardContent>
          </Card>

          {/* Position Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Position Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Asset:</span>
                  <span className="font-medium">
                    {watchedValues.asset
                      ? tradingPairs.find(
                          (p) => p.value === watchedValues.asset
                        )?.label || watchedValues.asset
                      : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Side:</span>
                  <span
                    className={`font-medium ${
                      watchedValues.side === "buy"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {watchedValues.side === "buy" ? "Long" : "Short"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium">
                    {watchedValues.size
                      ? `$${watchedValues.size.toLocaleString()}`
                      : "Not set"}
                  </span>
                </div>
                {watchedValues.price && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">
                      ${watchedValues.price.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  )
}
