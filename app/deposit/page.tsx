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
import { useBalances } from "@/hooks/use-balances"
import { isTestnet, SupportedChainId } from "@/lib/chains"
import BalanceDisplay from "@/components/balance-display"
import { ArrowRight, Wallet, TrendingUp } from "lucide-react"
import { TransferLog } from "@/components/transfer-log"
import { parseUnits, encodeFunctionData } from "viem"
import {
  HYPERLIQUID_MAINNET_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_USDC2,
  DEFAULT_USDC_DECIMALS,
} from "@/lib/constants"
import { ERC20_ABI } from "@/lib/abi"

const fundFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
})

type FundFormData = z.infer<typeof fundFormSchema>

export default function FundPage() {
  const { executeTransfer, logs, getClients } = useCrossChainTransfer()

  const [sourceChain, setSourceChain] = useState<SupportedChainId>(
    SupportedChainId.BASE_SEPOLIA
  )

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [transferStatus, setTransferStatus] = useState<string>("")

  const {
    balance,
    hyperliquidBalance,
    isLoadingBalance,
    isLoadingHyperliquid,
    fetchBalance,
    fetchHyperliquidBalance,
    refreshAllBalances,
  } = useBalances(sourceChain)

  const formMethods = useForm<FundFormData>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      amount: 0,
    },
    mode: "onChange",
  })

  const { control, watch, handleSubmit, reset } = formMethods
  const watchedAmount = watch("amount")

  const onSubmit = async (data: FundFormData) => {
    setIsSubmitting(true)
    setTransferStatus("Initiating transfer...")

    try {
      await executeTransfer(
        sourceChain,
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
    const numericAmount = parseUnits(amount, DEFAULT_USDC_DECIMALS)

    const bridgeAddress = isTestnet(sourceChain)
      ? HYPERLIQUID_TESTNET_BRIDGE_ADDRESS
      : HYPERLIQUID_MAINNET_BRIDGE_ADDRESS

    try {
      const walletClient = getClients(SupportedChainId.ARBITRUM_SEPOLIA)

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
          sourceChain={sourceChain}
          onRefresh={fetchBalance}
          onRefreshHyperliquid={fetchHyperliquidBalance}
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

              {/* Transfer Preview */}
              {watchedAmount > 0 && (
                <Card className="bg-gray-50 dark:bg-gray-800/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-600 dark:text-gray-400">
                          From:{" "}
                          {sourceChain === SupportedChainId.BASE_SEPOLIA
                            ? "Base Sepolia"
                            : "Sepolia"}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-gray-600 dark:text-gray-400">
                          To: Hyperliquid
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${formatAmount(watchedAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transfer Status */}
              {transferStatus && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    transferStatus.includes("failed")
                      ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                      : transferStatus.includes("completed")
                      ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                  }`}
                >
                  {transferStatus}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || watchedAmount <= 0}
                onClick={(e) => {
                  e.preventDefault()
                  handleSubmit(onSubmit)(e)
                }}
              >
                {isSubmitting ? "Transferring..." : "Transfer to Hyperliquid"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </FormProvider>

      <TransferLog logs={logs} />
    </div>
  )
}
