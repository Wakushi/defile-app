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
import { isTestnet, SupportedChainId } from "@/lib/chains"
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
import { toast } from "sonner"
import { getPublicClient, getWalletClient } from "@/lib/chain-utils"

const fundFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
})

type FundFormData = z.infer<typeof fundFormSchema>

export default function FundPage() {
  const { chainId, refreshAllBalances, address } = useUser()
  const { executeTransfer, logs, getClients } = useCrossChainTransfer()

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [transferStatus, setTransferStatus] = useState<string>("")

  const formMethods = useForm<FundFormData>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      amount: 0,
    },
    mode: "onChange",
  })

  const { control, handleSubmit, reset } = formMethods

  async function onSubmit(data: FundFormData) {
    if (!chainId || !address) {
      console.error("No chain ID or address available")
      return
    }

    setIsSubmitting(true)
    setTransferStatus("Initiating transfer...")

    try {
      await executeTransfer({
        from: address,
        sourceChainId: chainId,
        destinationChainId: SupportedChainId.ARBITRUM_SEPOLIA,
        amount: data.amount.toString(),
        transferType: "fast",
      })
    } catch (error) {
      console.error("Error sending USDC from source chain to Arbitrum:", error)
      setTransferStatus("Transfer failed. Please try again.")
      toast.error("Transfer failed. Please try again.")
      setIsSubmitting(false)
      return
    }

    toast.success("USDC transferred to Arbitrum")

    setTransferStatus("Bridging USDC to Hyperliquid...")

    try {
      await bridgeUSDCToHyperliquid(data.amount.toString())

      setTransferStatus("Transfer completed successfully!")
      toast.success("USDC transferred to Hyperliquid")

      setTimeout(() => {
        refreshAllBalances(chainId)
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

    const bridgeAddress = isTestnet(chainId)
      ? HYPERLIQUID_TESTNET_BRIDGE_ADDRESS
      : HYPERLIQUID_MAINNET_BRIDGE_ADDRESS

    if (!address) {
      throw new Error("No address available")
    }

    try {
      const publicClient = getPublicClient(chainId)
      const walletClient = getWalletClient(chainId)

      // Hyperliquid uses USDC2 on testnet

      const { request } = await publicClient.simulateContract({
        account: address,
        address: HYPERLIQUID_TESTNET_USDC2,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [bridgeAddress, numericAmount],
      })

      const tx = await walletClient.writeContract(request)

      console.log("Transaction hash:", tx)
      return tx
    } catch (error) {
      console.error("Error bridging USDC to Hyperliquid:", error)
      throw error
    }
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
        </form>
      </FormProvider>

      {/* Transfer Log */}
      <div className="mt-8">
        <TransferLog logs={logs} />
      </div>
    </div>
  )
}
