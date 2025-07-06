import { NextRequest, NextResponse } from "next/server"
import { HyperliquidService } from "@/app/api/(services)/hyperliquid.service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params

  try {
    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      )
    }

    const hyperliquidService = HyperliquidService.getInstance({
      privateKey: process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY || "",
    })

    const [marketPrice, perpMetadata, assetIndex] = await Promise.all([
      hyperliquidService.getAssetPrice(assetId),
      hyperliquidService.getAssetMetadata(assetId),
      hyperliquidService.getAssetIndex(assetId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        marketPrice,
        perpMetadata,
        assetIndex,
      },
    })
  } catch (error) {
    console.error("Error fetching asset data:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to fetch asset data" },
      { status: 500 }
    )
  }
}
