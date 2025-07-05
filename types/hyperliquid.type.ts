export interface HyperliquidMarginInfo {
  marginSummary: {
    accountValue: string
    totalNtlPos: string
    totalRawUsd: string
    totalMarginUsed: string
  }
  crossMarginSummary: {
    accountValue: string
    totalNtlPos: string
    totalRawUsd: string
    totalMarginUsed: string
  }
  crossMaintenanceMarginUsed: string
  withdrawable: string
  assetPositions: any[]
  time: number
}

export interface PerpMetadata {
  szDecimals: number
  name: string
  maxLeverage: number
}

export interface AssetPosition {
  type: "oneWay"
  position: {
    coin: string
    szi: string
    leverage: {
      type: "cross" | "isolated"
      value: number
    }
    entryPx: string
    positionValue: string
    unrealizedPnl: string
    returnOnEquity: string
    liquidationPx: string | null
    marginUsed: string
    maxLeverage: number
    cumFunding: {
      allTime: string
      sinceOpen: string
      sinceChange: string
    }
  }
}
