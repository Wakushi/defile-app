"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      side: "buy",
    },
  })

  const watchedSide = watch("side")

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
          Open leveraged positions on Hyperliquid from Base chain
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Position</CardTitle>
          <CardDescription>
            Select your trading pair and enter position details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Asset Selection */}
            <div className="space-y-2">
              <Label htmlFor="asset">Trading Pair</Label>
              <Select
                onValueChange={(value) => setValue("asset", value)}
                defaultValue={tradingPairs[0].value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trading pair" />
                </SelectTrigger>
                <SelectContent>
                  {tradingPairs.map((pair) => (
                    <SelectItem key={pair.value} value={pair.value}>
                      {pair.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.asset && (
                <p className="text-sm text-red-600">{errors.asset.message}</p>
              )}
            </div>

            {/* Side Selection */}
            <div className="space-y-2">
              <Label>Side</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={watchedSide === "buy" ? "default" : "outline"}
                  onClick={() => setValue("side", "buy")}
                  className="flex-1"
                >
                  Buy / Long
                </Button>
                <Button
                  type="button"
                  variant={watchedSide === "sell" ? "default" : "outline"}
                  onClick={() => setValue("side", "sell")}
                  className="flex-1"
                >
                  Sell / Short
                </Button>
              </div>
            </div>

            {/* Size Input */}
            <div className="space-y-2">
              <Label htmlFor="size">Size (USD)</Label>
              <Input
                id="size"
                type="number"
                step="0.01"
                placeholder="1000.00"
                {...register("size", { valueAsNumber: true })}
              />
              {errors.size && (
                <p className="text-sm text-red-600">{errors.size.message}</p>
              )}
            </div>

            {/* Price Input (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="price">Price (Optional)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="Leave empty for market order"
                {...register("price", { valueAsNumber: true })}
              />
              <p className="text-sm text-gray-500">
                Leave empty to place a market order
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Open Position"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Position Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Position Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Asset:</span>
              <span className="font-medium">
                {watch("asset") || "Not selected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Side:</span>
              <span
                className={`font-medium ${
                  watchedSide === "buy" ? "text-green-600" : "text-red-600"
                }`}
              >
                {watchedSide === "buy" ? "Long" : "Short"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">
                {watch("size")
                  ? `$${watch("size")?.toLocaleString()}`
                  : "Not set"}
              </span>
            </div>
            {watch("price") && (
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">
                  ${watch("price")?.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
