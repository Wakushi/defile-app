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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coin, orderId, user, testnet } = body

    if (!coin || !orderId || !user) {
      return NextResponse.json(
        { error: "Coin, order ID, and user are required" },
        { status: 400 }
      )
    }

    if (typeof orderId !== "number" || orderId <= 0) {
      return NextResponse.json(
        { error: "Order ID must be a positive number" },
        { status: 400 }
      )
    }

    const hyperliquidService = HyperliquidService.getInstance({
      privateKey: process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY || "",
    })

    const result = await hyperliquidService.closeMarketPosition({
      account: user as `0x${string}`,
      testnet: testnet ?? true,
      privateKey: process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY || "",
      asset: coin,
      orderId,
    })

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully cancelled order ${orderId} for ${coin}`,
    })
  } catch (error) {
    console.error("Error cancelling order:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    )
  }
}
