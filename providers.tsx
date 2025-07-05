"use client"

import { PrivyProvider } from "@privy-io/react-auth"
import { arbitrumSepolia } from "viem/chains"
import { UserStoreProvider } from "@/stores/user.store"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || ""}
      config={{ defaultChain: arbitrumSepolia }}
    >
      <UserStoreProvider>{children}</UserStoreProvider>
    </PrivyProvider>
  )
}
