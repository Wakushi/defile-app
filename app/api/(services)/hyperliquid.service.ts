import { Hyperliquid, UserFills, UserOpenOrders } from "hyperliquid"
import { Address } from "viem"
import { PerpMetadata } from "@/types/hyperliquid.type"

// Notation
// -> https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/notation

// About $100 size value -> 0.00092 BTC

// Mainnet bridge -> 0x2df1c51e09aecf9cacb7bc98cb1742757f163df7
// Testnet bridge -> 0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89

interface OpenMarketPositionResponse {
  status: "ok" | "error"
  response: {
    type: "order"
    data: { statuses: any[] }
  }
}

export class HyperliquidService {
  private static instance: HyperliquidService | null = null
  private readonly hyperliquid: Hyperliquid

  private constructor(private readonly config: { privateKey: string }) {
    try {
      this.hyperliquid = new Hyperliquid({
        testnet: true,
        privateKey: this.config.privateKey,
      })
    } catch (error) {
      console.error("Error initializing Hyperliquid:", error)
      throw error
    }
  }

  public static getInstance(config: {
    privateKey: string
  }): HyperliquidService {
    if (!HyperliquidService.instance) {
      HyperliquidService.instance = new HyperliquidService(config)
    }

    return HyperliquidService.instance
  }

  public static resetInstance(): void {
    HyperliquidService.instance = null
  }

  async getUserOpenOrders(user: Address): Promise<UserOpenOrders> {
    const orders = await this.hyperliquid.info.getUserOpenOrders(user)
    return orders
  }

  async getUserFills(user: Address): Promise<UserFills> {
    const fills = await this.hyperliquid.info.getUserFills(user)
    return fills
  }

  async openMarketPosition({
    account,
    testnet,
    privateKey,
    asset,
    sizeUsd,
    side,
    price,
    type,
  }: {
    account: Address
    testnet: boolean
    privateKey: string
    asset: string
    sizeUsd: number
    side: "buy" | "sell"
    price?: number
    type: "open" | "close"
  }) {
    const hyperliquid = new Hyperliquid({
      testnet,
      privateKey,
      walletAddress: account,
      enableWs: false,
    })

    const marketPrice = await this.getAssetPrice(asset)
    const perpMetadata = await this.getAssetMetadata(asset)

    const szDecimals = perpMetadata?.szDecimals ?? 3
    const maxPriceDecimals = Math.max(0, 6 - szDecimals)

    const rawPrice = price ?? marketPrice
    const limit_px = Number(rawPrice).toFixed(maxPriceDecimals)

    const size = (sizeUsd / rawPrice).toFixed(szDecimals)

    const response: OpenMarketPositionResponse =
      await hyperliquid.exchange.placeOrder({
        coin: asset,
        is_buy: side === "buy",
        sz: size,
        limit_px,
        order_type: { limit: { tif: "Gtc" } },
        reduce_only: type === "close",
      })

    const status = response.response.data.statuses[0]

    if (response.status !== "ok" || status.error) {
      throw new Error(status.error)
    }

    return status
  }

  async closeMarketPosition({
    account,
    testnet,
    privateKey,
    asset,
    orderId,
  }: {
    account: Address
    testnet: boolean
    privateKey: string
    asset: string
    orderId: number
  }) {
    const hyperliquid = new Hyperliquid({
      testnet,
      privateKey,
      walletAddress: account,
      enableWs: false,
    })

    const response = await hyperliquid.exchange.cancelOrder({
      coin: asset,
      o: orderId,
    })

    return response
  }

  async updateLeverage({
    asset,
    leverage,
    mode = "cross",
  }: {
    asset: string
    leverage: number
    mode?: "cross" | "isolated"
  }): Promise<"ok"> {
    if (!asset || !leverage) {
      throw new Error("Asset and leverage are required")
    }

    try {
      const response = await this.hyperliquid.exchange.updateLeverage(
        asset,
        mode,
        leverage
      )

      console.log(response)
    } catch (error) {
      console.error("Error updating leverage:", error)
      throw error
    }

    // You may optionally check/return the full response here
    return "ok"
  }

  async getAssetPrice(asset: string): Promise<number> {
    if (!asset) {
      throw new Error("Asset is required")
    }

    const mids = await this.hyperliquid.info.getAllMids()
    const price = mids[asset]

    if (!price) {
      throw new Error("Asset not found")
    }

    return Number(price)
  }

  async getAssetIndex(asset: string): Promise<string> {
    if (!asset) {
      throw new Error("Asset is required")
    }

    const assetIndex = await this.hyperliquid.info.getAssetIndex(asset)

    if (!assetIndex) {
      throw new Error("Asset not found")
    }

    return assetIndex.toString()
  }

  async getAssetMetadata(asset: string): Promise<PerpMetadata | undefined> {
    const perpMetadata = await this.hyperliquid.info.perpetuals.getMeta()
    const assetMetadata = perpMetadata.universe.find((p) => p.name === asset)

    if (!assetMetadata) {
      throw new Error("Asset not found")
    }

    return assetMetadata
  }

  async getAllPerpsAssets(): Promise<string[]> {
    const assets = await this.hyperliquid.info.getAllAssets()
    return assets.perp
  }
}
