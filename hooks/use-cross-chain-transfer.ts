"use client"

import { useState } from "react"
import {
  createWalletClient,
  http,
  encodeFunctionData,
  HttpTransport,
  type Chain,
  type Account,
  type WalletClient,
  type Hex,
  TransactionExecutionError,
  parseUnits,
  createPublicClient,
  formatUnits,
  parseEther,
} from "viem"
import { privateKeyToAccount, nonceManager } from "viem/accounts"
import axios from "axios"
import {
  sepolia,
  avalancheFuji,
  baseSepolia,
  sonicBlazeTestnet,
  lineaSepolia,
  arbitrumSepolia,
  worldchainSepolia,
  optimismSepolia,
  unichainSepolia,
  polygonAmoy,
} from "viem/chains"
import { defineChain } from "viem"

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
import { CIRCLE_ATTESTATION } from "@/lib/attestations"

// Custom Codex chain definition with Thirdweb RPC
const codexTestnet = defineChain({
  id: 812242,
  name: "Codex Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Codex",
    symbol: "CDX",
  },
  rpcUrls: {
    default: {
      http: ["https://812242.rpc.thirdweb.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Codex Explorer",
      url: "https://explorer.codex-stg.xyz/",
    },
  },
  testnet: true,
})

export type TransferStep =
  | "idle"
  | "approving"
  | "burning"
  | "waiting-attestation"
  | "minting"
  | "completed"
  | "error"

const chains = {
  [SupportedChainId.ETH_SEPOLIA]: sepolia,
  [SupportedChainId.AVAX_FUJI]: avalancheFuji,
  [SupportedChainId.BASE_SEPOLIA]: baseSepolia,
  [SupportedChainId.SONIC_BLAZE]: sonicBlazeTestnet,
  [SupportedChainId.LINEA_SEPOLIA]: lineaSepolia,
  [SupportedChainId.ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: worldchainSepolia,
  [SupportedChainId.OPTIMISM_SEPOLIA]: optimismSepolia,
  [SupportedChainId.CODEX_TESTNET]: codexTestnet,
  [SupportedChainId.UNICHAIN_SEPOLIA]: unichainSepolia,
  [SupportedChainId.POLYGON_AMOY]: polygonAmoy,
}

export function useCrossChainTransfer() {
  const [currentStep, setCurrentStep] = useState<TransferStep>("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const addLog = (message: string) =>
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ])

  // Utility function to get the appropriate private key for a chain
  const getPrivateKeyForChain = (chainId: number): string => {
    const evmKey =
      process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY ||
      process.env.NEXT_PUBLIC_PRIVATE_KEY

    if (!evmKey) {
      throw new Error(
        "EVM private key not found. Please set NEXT_PUBLIC_EVM_PRIVATE_KEY in your environment."
      )
    }

    return evmKey
  }

  const getPublicClient = (chainId: SupportedChainId) => {
    return createPublicClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
    })
  }

  const getClients = (chainId: SupportedChainId) => {
    const privateKey = getPrivateKeyForChain(chainId)

    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, "")}`, {
      nonceManager,
    })
    return createWalletClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
      account,
    })
  }

  const getBalance = async (chainId: SupportedChainId) => {
    return getEVMBalance(chainId)
  }

  const getEVMBalance = async (chainId: SupportedChainId) => {
    const publicClient = createPublicClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
    })
    const privateKey = getPrivateKeyForChain(chainId)
    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, "")}`, {
      nonceManager,
    })

    const balance = await publicClient.readContract({
      address: CHAIN_IDS_TO_USDC_ADDRESSES[chainId] as `0x${string}`,
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
      args: [account.address],
    })

    const formattedBalance = formatUnits(balance, DEFAULT_USDC_DECIMALS)
    return formattedBalance
  }

  // EVM functions (existing)
  const approveUSDC = async (
    client: WalletClient<HttpTransport, Chain, Account>,
    sourceChainId: number
  ) => {
    setCurrentStep("approving")
    addLog("Approving USDC transfer...")

    try {
      const tx = await client.sendTransaction({
        to: CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`,
        data: encodeFunctionData({
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
          args: [
            CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
            10000000000n,
          ],
        }),
      })

      addLog(`USDC Approval Tx: ${tx}`)
      return tx
    } catch (err) {
      setError("Approval failed")
      throw err
    }
  }

  const burnUSDC = async (
    client: WalletClient<HttpTransport, Chain, Account>,
    sourceChainId: number,
    amount: bigint,
    destinationChainId: number,
    destinationAddress: string,
    transferType: "fast" | "standard"
  ) => {
    setCurrentStep("burning")
    addLog("Burning USDC...")

    try {
      const finalityThreshold = transferType === "fast" ? 1000 : 2000
      const maxFee = amount - 1n

      // Handle Solana destination addresses differently
      let mintRecipient: string = `0x${destinationAddress
        .replace(/^0x/, "")
        .padStart(64, "0")}`

      const tx = await client.sendTransaction({
        to: CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
        data: encodeFunctionData({
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
        }),
      })

      addLog(`Burn Tx: ${tx}`)
      return tx
    } catch (err) {
      setError("Burn failed")
      throw err
    }
  }

  const retrieveAttestation = async (
    transactionHash: string,
    sourceChainId: number
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
    client: WalletClient<HttpTransport, Chain, Account>,
    destinationChainId: number,
    attestation: CircleAttestation
  ) => {
    const MAX_RETRIES = 3
    let retries = 0
    setCurrentStep("minting")
    addLog("Minting USDC...")

    while (retries < MAX_RETRIES) {
      try {
        const publicClient = createPublicClient({
          chain: chains[destinationChainId as keyof typeof chains],
          transport: http(),
        })
        const feeData = await publicClient.estimateFeesPerGas()
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

        // Estimate gas with buffer
        const gasEstimate = await publicClient.estimateContractGas({
          ...contractConfig,
          functionName: "receiveMessage",
          args: [attestation.message, attestation.attestation],
          account: client.account,
        })

        // Add 20% buffer to gas estimate
        const gasWithBuffer = (gasEstimate * 120n) / 100n
        addLog(`Gas Used: ${formatUnits(gasWithBuffer, 9)} Gwei`)

        const tx = await client.sendTransaction({
          to: contractConfig.address,
          data: encodeFunctionData({
            ...contractConfig,
            functionName: "receiveMessage",
            args: [attestation.message, attestation.attestation],
          }),
          gas: gasWithBuffer,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        })

        addLog(`Minted USDC on Arbitrum! Tx: ${tx}`)
        setCurrentStep("completed")
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

  const executeTransfer = async (
    sourceChainId: number,
    destinationChainId: number,
    amount: string,
    transferType: "fast" | "standard"
  ) => {
    try {
      const numericAmount = parseUnits(amount, DEFAULT_USDC_DECIMALS)

      let sourceClient: any, destinationClient: any, defaultDestination: string

      sourceClient = getClients(sourceChainId)
      destinationClient = getClients(destinationChainId)

      const destinationPrivateKey = getPrivateKeyForChain(destinationChainId)
      const account = privateKeyToAccount(
        `0x${destinationPrivateKey.replace(/^0x/, "")}`
      )
      defaultDestination = account.address

      const checkNativeBalance = async (chainId: SupportedChainId) => {
        const publicClient = createPublicClient({
          chain: chains[chainId as keyof typeof chains],
          transport: http(),
        })
        const privateKey = getPrivateKeyForChain(chainId)
        const account = privateKeyToAccount(
          `0x${privateKey.replace(/^0x/, "")}`
        )
        const balance = await publicClient.getBalance({
          address: account.address,
        })
        return balance
      }

      await approveUSDC(sourceClient, sourceChainId)

      let burnTx: string

      burnTx = await burnUSDC(
        sourceClient,
        sourceChainId,
        numericAmount,
        destinationChainId,
        defaultDestination,
        transferType
      )

      const attestation = await retrieveAttestation(burnTx, sourceChainId)

      const minBalance = parseEther("0.01") // 0.01 native token

      const balance = await checkNativeBalance(destinationChainId)
      if (balance < minBalance) {
        throw new Error("Insufficient native token for gas fees")
      }

      await mintUSDC(destinationClient, destinationChainId, attestation)
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
    getBalance,
    getPublicClient,
    getClients,
    reset,
  }
}
