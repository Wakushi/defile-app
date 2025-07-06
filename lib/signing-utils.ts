import { ethers } from "ethers"

export interface Signature {
  r: string
  s: string
  v: number
}

export function splitSig(sig: string): Signature {
  const { r, s, v } = ethers.Signature.from(sig)
  return { r, s, v }
}
