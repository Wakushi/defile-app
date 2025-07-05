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

    const fills = await hyperliquidService.getUserFills(user as `0x${string}`)

    return NextResponse.json({ fills })
  } catch (error) {
    console.error("Error getting user fills:", error)
    return NextResponse.json(
      { error: "Failed to get user fills" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset, size, side, price } = body

    if (!asset || !size || !side) {
      return NextResponse.json(
        { error: "Asset, size, and side are required" },
        { status: 400 }
      )
    }

    if (!["buy", "sell"].includes(side)) {
      return NextResponse.json(
        { error: "Side must be 'buy' or 'sell'" },
        { status: 400 }
      )
    }

    if (typeof size !== "number" || size <= 0) {
      return NextResponse.json(
        { error: "Size must be a positive number" },
        { status: 400 }
      )
    }

    if (price !== undefined && (typeof price !== "number" || price <= 0)) {
      return NextResponse.json(
        { error: "Price must be a positive number if provided" },
        { status: 400 }
      )
    }

    const hyperliquidService = HyperliquidService.getInstance({
      privateKey: process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY || "",
    })

    const result = await hyperliquidService.openMarketPosition({
      asset,
      size,
      side,
      price,
    })

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully opened ${side} position for ${asset} with size ${size}`,
    })
  } catch (error) {
    console.error("Error opening market position:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to open market position" },
      { status: 500 }
    )
  }
}
