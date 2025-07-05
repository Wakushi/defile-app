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
import { useHyperliquid } from "@/hooks/use-hyperliquid"
import { USER } from "@/lib/constants"
import { OpenPositionsTable } from "@/components/open-positions-table"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const tradeFormSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  sizeUsd: z.number().positive("Size must be positive"),
  side: z.enum(["buy", "sell"]),
  price: z.number().optional(),
})

type TradeFormData = z.infer<typeof tradeFormSchema>

export default function TradingPage() {
  const {
    openPositions,
    isLoadingOpenPositions,
    perpsAssets,
    isLoadingPerpsAssets,
  } = useHyperliquid(USER)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const formMethods = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      asset: "BTC-PERP",
      side: "buy",
      sizeUsd: 0,
      price: undefined,
    },
    mode: "onChange",
  })

  const { control, watch, handleSubmit } = formMethods

  const watchedValues = watch()

  async function onSubmit(data: TradeFormData): Promise<void> {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/hyperliquid/position", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to open position")
      }

      const result = await response.json()
      console.log("Position opened:", result)
      toast.success("Position opened successfully")
    } catch (error) {
      console.error("Error opening position:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatAssetName(asset: string): string {
    return asset.replace("PERP", "USD")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Perpetual Trading
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Open leveraged positions on Hyperliquid using liquidity from any chain
        </p>
      </div>

      <div className="flex gap-4">
        <div className="w-[80%]">
          <OpenPositionsTable
            positions={openPositions}
            isLoading={isLoadingOpenPositions}
          />
        </div>
        <div className="w-[20%]">
          {isLoadingPerpsAssets ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl className="w-full">
                              <SelectTrigger>
                                <SelectValue placeholder="Select a trading pair" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {perpsAssets.map((assetName) => (
                                <SelectItem key={assetName} value={assetName}>
                                  {formatAssetName(assetName)}
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
                      name="sizeUsd"
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
                                field.onChange(
                                  value ? parseFloat(value) : undefined
                                )
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
                            ? formatAssetName(
                                perpsAssets.find(
                                  (asset) => asset === watchedValues.asset
                                ) || watchedValues.asset
                              )
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
                          {watchedValues.sizeUsd
                            ? `$${watchedValues.sizeUsd.toLocaleString()}`
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
          )}
        </div>
      </div>
    </div>
  )
}
