import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { type Chain, fallback, http } from 'viem'
import * as allChains from 'wagmi/chains'

const chains = (Object.values(allChains) as unknown as Chain[]).filter(
  (c) => c && typeof c === 'object' && typeof c.id === 'number',
) as [Chain, ...Chain[]]

// viem's default mainnet RPC (eth.merkle.io) is unreliable; prefer well-known
// public endpoints first and only fall back to the chain default.
const MAINNET_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
]

const transports = Object.fromEntries(
  chains.map((c) => [
    c.id,
    c.id === 1 ? fallback([...MAINNET_RPCS.map((url) => http(url)), http()]) : http(),
  ]),
)

export const config = getDefaultConfig({
  appName: 'Any Token Mint',
  projectId: import.meta.env.VITE_WC_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains,
  transports,
  ssr: false,
})
