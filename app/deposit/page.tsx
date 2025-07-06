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
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
  Address,
} from "viem"
import {
  HYPERLIQUID_MAINNET_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_USDC2,
  DEFAULT_USDC_DECIMALS,
  ARBITRUM_USDC,
} from "@/lib/constants"
import { ERC20_ABI } from "@/lib/abi"
import { useUser } from "@/stores/user.store"
import { toast } from "sonner"
import { getPublicClient, getWalletClient } from "@/lib/chain-utils"
import { arbitrumSepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { switchChain } from "viem/actions"
import { sleep } from "@/lib/ts-utils"

const fundFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
})

type FundFormData = z.infer<typeof fundFormSchema>

export default function FundPage() {
  const { chainId, refreshAllBalances, address } = useUser()
  const { executeTransfer, transferStatus, setTransferStatus } =
    useCrossChainTransfer()

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

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

    // If the user already has USDC on Arbitrum, we just need to bridge it to Hyperliquid
    const usdcAddress = isTestnet(chainId)
      ? HYPERLIQUID_TESTNET_USDC2
      : ARBITRUM_USDC

    const usdcBalance = await getERC20Balance(usdcAddress)

    if (+usdcBalance < data.amount) {
      try {
        await executeTransfer({
          from: address,
          sourceChainId: chainId,
          destinationChainId: SupportedChainId.ARBITRUM_SEPOLIA,
          amount: data.amount.toString(),
          transferType: "fast",
        })
      } catch (error) {
        console.error(
          "Error sending USDC from source chain to Arbitrum:",
          error
        )
        setTransferStatus("Transfer failed. Please try again.")
        toast.error("Transfer failed. Please try again.")
        setIsSubmitting(false)
        return
      }
    }

    toast.success("Bridging USDC to Hyperliquid...")
    setTransferStatus("Bridging USDC to Hyperliquid...")

    try {
      await bridgeUSDCToHyperliquid(data.amount.toString())

      setTransferStatus("Transfer completed successfully!")
      toast.success("USDC transferred to Hyperliquid")

      await sleep(3000)

      toast.success("Funds will be available on Hyperliquid in under 5 minutes")

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
      const isTestnetChain = isTestnet(chainId)

      const usdcAddress = isTestnetChain
        ? HYPERLIQUID_TESTNET_USDC2
        : ARBITRUM_USDC

      if (isTestnetChain) {
        // Hyperliquid uses USDC2 on testnet and not classic USDC, so we need to credit some USDC2 to tester user
        const usdc2Balance = await getERC20Balance(usdcAddress)

        if (+usdc2Balance < 10) {
          await fundTesterUSDC2(amount.toString())
        }
      }

      const publicClient = getPublicClient(SupportedChainId.ARBITRUM_SEPOLIA)
      const walletClient = getWalletClient(SupportedChainId.ARBITRUM_SEPOLIA)

      await switchChain(walletClient, {
        id: SupportedChainId.ARBITRUM_SEPOLIA,
      })

      const { request } = await publicClient.simulateContract({
        account: address,
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [bridgeAddress, numericAmount],
      })

      const tx = await walletClient.writeContract(request)

      await switchChain(walletClient, {
        id: chainId,
      })

      return tx
    } catch (error) {
      console.error("Error bridging USDC to Hyperliquid:", error)
      throw error
    }
  }

  async function getERC20Balance(token: Address) {
    if (!chainId || !address) {
      return "0"
    }

    const publicClient = getPublicClient(SupportedChainId.ARBITRUM_SEPOLIA)

    const balance = await publicClient.readContract({
      address: token,
      abi: [
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [address],
    })

    const formattedBalance = formatUnits(balance, DEFAULT_USDC_DECIMALS)
    return formattedBalance
  }

  async function fundTesterUSDC2(amount: string) {
    const privateKey = process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY

    if (!privateKey) {
      throw new Error("Private key not found")
    }

    try {
      const account = privateKeyToAccount(`0x${privateKey}`)

      const walletClient = createWalletClient({
        account,
        chain: arbitrumSepolia,
        transport: http(),
      })

      const publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(),
      })

      const TEN_USDC2 = parseUnits(amount, DEFAULT_USDC_DECIMALS)

      const { request } = await publicClient.simulateContract({
        account,
        address: HYPERLIQUID_TESTNET_USDC2,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [address, TEN_USDC2],
      })

      const tx = await walletClient.writeContract(request)

      await publicClient.waitForTransactionReceipt({
        hash: tx,
      })

      await sleep(2000)

      return tx
    } catch (error: any) {
      console.log(error)
      throw new Error(error)
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
    </div>
  )
}
