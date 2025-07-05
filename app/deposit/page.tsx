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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useCrossChainTransfer } from "@/hooks/use-cross-chain-transfer"
import { getChainName, SupportedChainId } from "@/lib/chains"
import BalanceDisplay from "@/components/balance-display"
import { TransferLog } from "@/components/transfer-log"
import { parseUnits, encodeFunctionData } from "viem"
import {
  HYPERLIQUID_MAINNET_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_USDC2,
  DEFAULT_USDC_DECIMALS,
} from "@/lib/constants"
import { ERC20_ABI } from "@/lib/abi"
import { useUser } from "@/stores/user.store"

const fundFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
})

type FundFormData = z.infer<typeof fundFormSchema>

export default function FundPage() {
  const { executeTransfer, logs, getClients } = useCrossChainTransfer()
  const { chainId, balance, hyperliquidBalance, refreshAllBalances } = useUser()

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [transferStatus, setTransferStatus] = useState<string>("")

  const formMethods = useForm<FundFormData>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      amount: 0,
    },
    mode: "onChange",
  })

  const { control, watch, handleSubmit, reset } = formMethods
  const watchedAmount = watch("amount")

  async function onSubmit(data: FundFormData) {
    if (!chainId) {
      console.error("No chain ID available")
      return
    }

    setIsSubmitting(true)
    setTransferStatus("Initiating transfer...")

    try {
      await executeTransfer(
        chainId,
        SupportedChainId.ARBITRUM_SEPOLIA,
        data.amount.toString(),
        "standard"
      )
    } catch (error) {
      console.error("Error sending USDC from source chain to Arbitrum:", error)
      setTransferStatus("Transfer failed. Please try again.")
      setIsSubmitting(false)
      return
    }

    setTransferStatus("Bridging USDC to Hyperliquid...")

    try {
      await bridgeUSDCToHyperliquid(data.amount.toString())

      setTransferStatus("Transfer completed successfully!")

      setTimeout(() => {
        refreshAllBalances()
        reset()
        setTransferStatus("")
      }, 2000)
    } catch (error) {
      console.error("Error sending USDC from Arbitrum to Hyperliquid:", error)
      setTransferStatus("Transfer failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function bridgeUSDCToHyperliquid(amount: string) {
    if (!chainId) {
      console.error("No chain ID available")
      return
    }

    const numericAmount = parseUnits(amount, DEFAULT_USDC_DECIMALS)

    const bridgeAddress =
      chainId === SupportedChainId.BASE_SEPOLIA
        ? HYPERLIQUID_TESTNET_BRIDGE_ADDRESS
        : HYPERLIQUID_MAINNET_BRIDGE_ADDRESS

    try {
      const walletClient = getClients(chainId)

      if (!walletClient) {
        throw new Error("Wallet client not available")
      }

      const tx = await walletClient.sendTransaction({
        to: HYPERLIQUID_TESTNET_USDC2,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [bridgeAddress, numericAmount],
        }),
      })

      console.log("Transaction hash:", tx)
      return tx
    } catch (error) {
      console.error("Error bridging USDC to Hyperliquid:", error)
      throw error
    }
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Deposit USDC to Hyperliquid
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Transfer USDC from your wallet to Hyperliquid for trading.
        </p>
      </div>

      {/* Balance Display */}
      <div className="mb-6">
        <BalanceDisplay
          balance={balance}
          hyperliquidBalance={hyperliquidBalance}
          sourceChain={chainId || SupportedChainId.BASE_SEPOLIA}
          onRefresh={refreshAllBalances}
          onRefreshHyperliquid={refreshAllBalances}
        />
      </div>

      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Funds</CardTitle>
              <CardDescription>
                Enter the amount you want to transfer to your Hyperliquid
                account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input */}
              <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USDC)</FormLabel>
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

              {/* Transfer Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault()
                  handleSubmit(onSubmit)(e)
                }}
              >
                {isSubmitting ? "Processing..." : "Transfer to Hyperliquid"}
              </Button>

              {/* Transfer Status */}
              {transferStatus && (
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {transferStatus}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {watchedAmount
                      ? `$${formatAmount(watchedAmount)}`
                      : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">
                    {chainId ? getChainName(chainId) : "Unknown Chain"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">Hyperliquid</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>

      {/* Transfer Log */}
      <div className="mt-8">
        <TransferLog logs={logs} />
      </div>
    </div>
  )
}
