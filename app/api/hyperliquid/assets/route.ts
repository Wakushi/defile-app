import { NextResponse } from "next/server"
import { HyperliquidService } from "@/app/api/(services)/hyperliquid.service"

export async function GET() {
  try {
    const hyperliquidService = HyperliquidService.getInstance({
      privateKey: process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY || "",
    })

    const assets = await hyperliquidService.getAllPerpsAssets()

    return NextResponse.json({ assets })
  } catch (error) {
    console.error("Error getting all perps assets:", error)
    return NextResponse.json(
      { error: "Failed to get all perps assets" },
      { status: 500 }
    )
  }
}
