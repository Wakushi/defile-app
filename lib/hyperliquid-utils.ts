import { Address } from "viem"
import { SupportedChainId } from "./chains"
import {
  HYPERLIQUID_MAINNET_API_URL,
  HYPERLIQUID_TESTNET_API_URL,
} from "./constants"
import { getWalletClient } from "./chain-utils"
import { splitSig } from "./signing-utils"

export async function approveAgent({
  account,
  chainId,
  isMainnet,
  agentName = "Bob",
}: {
  account: Address
  chainId: SupportedChainId
  isMainnet: boolean
  agentName?: string
}): Promise<any> {
  const nonce = Date.now()

  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId,
    verifyingContract:
      "0x0000000000000000000000000000000000000000" as `0x${string}`,
  }

  const types = {
    "HyperliquidTransaction:ApproveAgent": [
      { name: "hyperliquidChain", type: "string" },
      { name: "agentAddress", type: "address" },
      { name: "agentName", type: "string" },
      { name: "nonce", type: "uint64" },
    ],
  }

  const AGENT_ADDRESS = "0x35E34708C7361F99041a9b046C72Ea3Fcb29134c"

  const message = {
    hyperliquidChain: isMainnet ? "Mainnet" : "Testnet",
    agentAddress: AGENT_ADDRESS.toLowerCase(),
    agentName,
    nonce,
  }

  const walletClient = getWalletClient(chainId)

  const rawSig = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:ApproveAgent",
    message,
  })

  const signature = splitSig(rawSig)

  const payload = {
    action: {
      type: "approveAgent",
      hyperliquidChain: message.hyperliquidChain,
      signatureChainId: `0x${chainId.toString(16)}`,
      agentAddress: message.agentAddress,
      agentName: message.agentName,
      nonce,
    },
    nonce,
    signature,
  }

  const url = isMainnet
    ? HYPERLIQUID_MAINNET_API_URL
    : HYPERLIQUID_TESTNET_API_URL

  const response = await fetch(`${url}/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok || result.status === "err") {
    const errorMessage = result.response || response.statusText

    if (errorMessage.includes("Extra agent already used")) {
      return result
    }

    throw new Error(`Agent approval failed: ${errorMessage}`)
  }

  return result
}
