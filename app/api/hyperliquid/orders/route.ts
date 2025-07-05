import { NextRequest, NextResponse } from "next/server"
import { HyperliquidService } from "@/app/api/(services)/hyperliquid.service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get("user")

    if (!user) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      )
    }

    const hyperliquidService = HyperliquidService.getInstance({
      privateKey: process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY || "",
    })

    const orders = await hyperliquidService.getUserOpenOrders(
      user as `0x${string}`
    )

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Error getting user open orders:", error)
    return NextResponse.json(
      { error: "Failed to get user open orders" },
      { status: 500 }
    )
  }
}
