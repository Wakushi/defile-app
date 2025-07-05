import { createPublicClient, createWalletClient, custom, http } from "viem"
import { SupportedChainId } from "./chains"
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

export const chains = {
  [SupportedChainId.ETH_SEPOLIA]: sepolia,
  [SupportedChainId.AVAX_FUJI]: avalancheFuji,
  [SupportedChainId.BASE_SEPOLIA]: baseSepolia,
  [SupportedChainId.SONIC_BLAZE]: sonicBlazeTestnet,
  [SupportedChainId.LINEA_SEPOLIA]: lineaSepolia,
  [SupportedChainId.ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: worldchainSepolia,
  [SupportedChainId.OPTIMISM_SEPOLIA]: optimismSepolia,
  [SupportedChainId.UNICHAIN_SEPOLIA]: unichainSepolia,
  [SupportedChainId.POLYGON_AMOY]: polygonAmoy,
}

export const getPublicClient = (chainId: SupportedChainId) => {
  return createPublicClient({
    chain: chains[chainId as keyof typeof chains],
    transport: http(),
  })
}

export const getWalletClient = (chainId: SupportedChainId) => {
  if (!window.ethereum) throw new Error("Metamask non détecté")

  return createWalletClient({
    chain: chains[chainId as keyof typeof chains],
    // @ts-ignore
    transport: custom(window.ethereum),
  })
}
