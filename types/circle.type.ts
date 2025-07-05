import { Hex } from "viem"

export interface CircleAttestation {
  attestation: Hex
  message: Hex
  eventNonce: string
  cctpVersion: number
  status: "complete" | "pending" | "failed" // extend if needed
  decodedMessage: {
    sourceDomain: string
    destinationDomain: string
    nonce: string
    sender: string
    recipient: string
    destinationCaller: string
    minFinalityThreshold: string
    finalityThresholdExecuted: string
    messageBody: string
    decodedMessageBody: {
      burnToken: string
      mintRecipient: string
      amount: string
      messageSender: string
      maxFee: string
      feeExecuted: string
      expirationBlock: string
      hookData: string | null
    }
  }
  delayReason: string | null
}
