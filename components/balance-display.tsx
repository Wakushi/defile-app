import { SupportedChainId } from "@/lib/chains"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Wallet, RefreshCw } from "lucide-react"

export default function BalanceDisplay({
  balance,
  sourceChain,
  onRefresh,
}: {
  balance: string
  sourceChain: SupportedChainId
  onRefresh: () => void
}) {
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (isNaN(num)) return "0.00"
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getChainName = (chainId: SupportedChainId) => {
    switch (chainId) {
      case SupportedChainId.ETH_SEPOLIA:
        return "Sepolia"
      case SupportedChainId.BASE_SEPOLIA:
        return "Base Sepolia"
      case SupportedChainId.ARBITRUM_SEPOLIA:
        return "Arbitrum Sepolia"
      default:
        return "Unknown"
    }
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Available Balance
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {getChainName(sourceChain)} Network
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${formatBalance(balance)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">USDC</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
