"use client"

import { useCallback, useState } from "react"
import {
  createWalletClient,
  http,
  type Hex,
  TransactionExecutionError,
  parseUnits,
  createPublicClient,
  formatUnits,
  parseEther,
  Address,
  custom,
} from "viem"
import axios from "axios"
import { switchChain } from "viem/actions"

import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_TOKEN_MESSENGER,
  CHAIN_IDS_TO_MESSAGE_TRANSMITTER,
  DESTINATION_DOMAINS,
  IRIS_API_URL,
} from "@/lib/chains"
import { DEFAULT_USDC_DECIMALS } from "@/lib/constants"
import { CircleAttestation } from "@/types/circle.type"
import { chains, getPublicClient, getWalletClient } from "@/lib/chain-utils"

export type TransferStep =
  | "idle"
  | "approving"
  | "burning"
  | "waiting-attestation"
  | "minting"
  | "completed"
  | "error"

export function useCrossChainTransfer() {
  const [currentStep, setCurrentStep] = useState<TransferStep>("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const addLog = (message: string) =>
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ])

  const getClients = (chainId: SupportedChainId) => {
    return createWalletClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
    })
  }

  const approveUSDC = async (
    address: Address,
    amount: bigint,
    sourceChainId: SupportedChainId
  ) => {
    setCurrentStep("approving")
    addLog("Checking USDC allowance...")

    const spender = CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[
      sourceChainId
    ] as `0x${string}`

    try {
      const publicClient = getPublicClient(sourceChainId)
      const walletClient = getWalletClient(sourceChainId)

      const allowance = await publicClient.readContract({
        address: usdcAddress,
        abi: [
          {
            name: "allowance",
            type: "function",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "allowance",
        args: [address, spender],
      })

      if (BigInt(allowance) >= amount) {
        addLog("USDC allowance already sufficient. Skipping approval.")
        return null
      }

      const { request } = await publicClient.simulateContract({
        account: address,
        address: usdcAddress,
        abi: [
          {
            type: "function",
            name: "approve",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [spender, amount],
      })

      const tx = await walletClient.writeContract(request)

      addLog(`USDC Approval Tx: ${tx}`)
      return tx
    } catch (err) {
      setError("Approval failed")
      throw err
    }
  }

  const burnUSDC = async (
    address: Address,
    sourceChainId: SupportedChainId,
    amount: bigint,
    destinationChainId: SupportedChainId,
    destinationAddress: string,
    transferType: "fast" | "standard"
  ) => {
    setCurrentStep("burning")
    addLog("Burning USDC...")

    try {
      const finalityThreshold = transferType === "fast" ? 1000 : 2000
      const maxFee = amount - 1n

      let mintRecipient: string = `0x${destinationAddress
        .replace(/^0x/, "")
        .padStart(64, "0")}`

      const publicClient = getPublicClient(sourceChainId)
      const walletClient = getWalletClient(sourceChainId)

      const { request } = await publicClient.simulateContract({
        account: address,
        address: CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
        abi: [
          {
            type: "function",
            name: "depositForBurn",
            stateMutability: "nonpayable",
            inputs: [
              { name: "amount", type: "uint256" },
              { name: "destinationDomain", type: "uint32" },
              { name: "mintRecipient", type: "bytes32" },
              { name: "burnToken", type: "address" },
              { name: "hookData", type: "bytes32" },
              { name: "maxFee", type: "uint256" },
              { name: "finalityThreshold", type: "uint32" },
            ],
            outputs: [],
          },
        ],
        functionName: "depositForBurn",
        args: [
          amount,
          DESTINATION_DOMAINS[destinationChainId],
          mintRecipient as Hex,
          CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          maxFee,
          finalityThreshold,
        ],
      })

      const tx = await walletClient.writeContract(request)

      addLog(`Burn Tx: ${tx}`)
      return tx
    } catch (err) {
      setError("Burn failed")
      throw err
    }
  }

  const retrieveAttestation = async (
    transactionHash: string,
    sourceChainId: SupportedChainId
  ) => {
    setCurrentStep("waiting-attestation")
    addLog("Retrieving attestation...")

    const url = `${IRIS_API_URL}/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`

    while (true) {
      try {
        const response = await axios.get(url)
        if (response.data?.messages?.[0]?.status === "complete") {
          addLog("Attestation retrieved!")
          return response.data.messages[0]
        }
        addLog("Waiting for attestation...")
        await new Promise((resolve) => setTimeout(resolve, 5000))
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
          continue
        }
        setError("Attestation retrieval failed")
        addLog(
          `Attestation error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
        throw error
      }
    }
  }

  const mintUSDC = async (
    from: Address,
    sourceChainId: number,
    destinationChainId: number,
    attestation: CircleAttestation
  ) => {
    const MAX_RETRIES = 3
    let retries = 0
    setCurrentStep("minting")
    addLog("Minting USDC...")

    while (retries < MAX_RETRIES) {
      try {
        const publicClient = getPublicClient(destinationChainId)

        const contractConfig = {
          address: CHAIN_IDS_TO_MESSAGE_TRANSMITTER[
            destinationChainId
          ] as `0x${string}`,
          abi: [
            {
              type: "function",
              name: "receiveMessage",
              stateMutability: "nonpayable",
              inputs: [
                { name: "message", type: "bytes" },
                { name: "attestation", type: "bytes" },
              ],
              outputs: [],
            },
          ] as const,
        }

        const gasEstimate = await publicClient.estimateContractGas({
          ...contractConfig,
          functionName: "receiveMessage",
          args: [attestation.message, attestation.attestation],
          account: from,
        })

        // Add 20% buffer to gas estimate
        const gasWithBuffer = (gasEstimate * 120n) / 100n
        addLog(`Gas Used: ${formatUnits(gasWithBuffer, 9)} Gwei`)

        const walletClient = getWalletClient(destinationChainId)

        await switchChain(walletClient, {
          id: destinationChainId,
        })

        const { request } = await publicClient.simulateContract({
          ...contractConfig,
          functionName: "receiveMessage",
          args: [attestation.message, attestation.attestation],
          account: from,
        })

        const tx = await walletClient.writeContract(request)

        addLog(`Minted USDC on Arbitrum! Tx: ${tx}`)
        setCurrentStep("completed")

        await switchChain(walletClient, {
          id: sourceChainId,
        })
        break
      } catch (err) {
        if (err instanceof TransactionExecutionError && retries < MAX_RETRIES) {
          retries++
          addLog(`Retry ${retries}/${MAX_RETRIES}...`)
          await new Promise((resolve) => setTimeout(resolve, 2000 * retries))
          continue
        }
        throw err
      }
    }
  }

  const executeTransfer = async ({
    from,
    sourceChainId,
    destinationChainId,
    amount,
    transferType,
  }: {
    from: Address
    sourceChainId: number
    destinationChainId: number
    amount: string
    transferType: "fast" | "standard"
  }) => {
    try {
      if (!from) {
        throw new Error("No from address provided")
      }

      const numericAmount = parseUnits(amount, DEFAULT_USDC_DECIMALS)

      const checkNativeBalance = async (chainId: SupportedChainId) => {
        const publicClient = createPublicClient({
          chain: chains[chainId as keyof typeof chains],
          transport: http(),
        })
        const balance = await publicClient.getBalance({
          address: from,
        })
        return balance
      }

      await approveUSDC(from, numericAmount, sourceChainId)

      let burnTx: string

      burnTx = await burnUSDC(
        from,
        sourceChainId,
        numericAmount,
        destinationChainId,
        from,
        transferType
      )

      const attestation = await retrieveAttestation(burnTx, sourceChainId)

      const minBalance = parseEther("0.01")

      const balance = await checkNativeBalance(destinationChainId)

      if (balance < minBalance) {
        throw new Error("Insufficient native token for gas fees")
      }

      await mintUSDC(from, sourceChainId, destinationChainId, attestation)
    } catch (error) {
      setCurrentStep("error")
      addLog(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  const reset = () => {
    setCurrentStep("idle")
    setLogs([])
    setError(null)
  }

  return {
    currentStep,
    logs,
    error,
    executeTransfer,
    getClients,
    reset,
  }
}
