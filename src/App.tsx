import { ConnectButton } from '@rainbow-me/rainbowkit'
import { type FormEvent, useState } from 'react'
import { type Address, isAddress, parseUnits } from 'viem'
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import './App.css'

const ERC20_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

function App() {
  const { address, chain, chainId } = useAccount()

  const [tokenAddress, setTokenAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')

  const validToken = isAddress(tokenAddress)
  const validRecipient = isAddress(recipient)
  const token = validToken ? (tokenAddress as Address) : undefined

  const {
    data: decimals,
    error: decimalsError,
    isFetching: decimalsLoading,
  } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId,
    query: { enabled: !!token && !!chainId },
  })

  const { data: symbol } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId,
    query: { enabled: !!token && !!chainId },
  })

  let parsedAmount: bigint | undefined
  let amountError: string | undefined
  if (amount && decimals !== undefined) {
    try {
      parsedAmount = parseUnits(amount, decimals)
    } catch {
      amountError = 'Invalid amount'
    }
  }

  const simEnabled =
    !!address && !!chainId && !!token && validRecipient && parsedAmount !== undefined
  const {
    data: simulation,
    error: simError,
    isFetching: simulating,
  } = useSimulateContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'mint',
    args:
      validRecipient && parsedAmount !== undefined
        ? [recipient as Address, parsedAmount]
        : undefined,
    chainId,
    account: address,
    query: { enabled: simEnabled },
  })

  const { writeContract, data: hash, isPending: sending, reset } = useWriteContract()
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (simulation) writeContract(simulation.request)
  }

  const submitDisabled = !address || !simulation || sending || confirming || simulating

  const errorMessage = (e: { shortMessage?: string; message: string }) =>
    e.shortMessage ?? e.message

  let hint: { kind: 'info' | 'error'; text: string } | undefined
  if (!address) {
    hint = { kind: 'info', text: 'Connect a wallet to mint.' }
  } else if (!chainId) {
    hint = { kind: 'info', text: 'Waiting for wallet network…' }
  } else if (!tokenAddress) {
    hint = { kind: 'info', text: 'Enter the ERC20 token address.' }
  } else if (!validToken) {
    hint = { kind: 'error', text: 'Token address is not a valid 0x address.' }
  } else if (decimalsError) {
    hint = {
      kind: 'error',
      text: `Could not read token on ${chain?.name ?? `chain ${chainId}`} — make sure the address is an ERC20 deployed on this network. (${errorMessage(decimalsError)})`,
    }
  } else if (decimalsLoading || decimals === undefined) {
    hint = { kind: 'info', text: 'Reading token info…' }
  } else if (!amount) {
    hint = { kind: 'info', text: 'Enter an amount to mint.' }
  } else if (amountError) {
    hint = { kind: 'error', text: amountError }
  } else if (!recipient) {
    hint = { kind: 'info', text: 'Enter the recipient address.' }
  } else if (!validRecipient) {
    hint = { kind: 'error', text: 'Recipient is not a valid 0x address.' }
  } else if (simulating) {
    hint = { kind: 'info', text: 'Simulating mint…' }
  } else if (simError) {
    hint = {
      kind: 'error',
      text: `Mint would revert: ${errorMessage(simError)}. The token may not expose mint(address,uint256) or your wallet may not be authorized.`,
    }
  }

  return (
    <>
      <header id="topbar">
        <a className="brand" href="/">
          Any Token Mint
        </a>
        <ConnectButton showBalance={false} chainStatus="full" />
      </header>

      <main id="center">
        <div className="hero-text">
          <h1>Mint Tokens</h1>
        </div>

        <form className="card" onSubmit={onSubmit}>
          <h2>Token information</h2>

          <div className="network-row">
            <span className="label">Network</span>
            <span className="value">
              {chain?.name ?? (chainId ? `Chain ${chainId}` : 'Connect a wallet')}
            </span>
          </div>

          <label htmlFor="token">
            Token address<span className="req">*</span>
          </label>
          <div className="input-row">
            <input
              id="token"
              autoComplete="off"
              spellCheck={false}
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value.trim())}
              placeholder="0x..."
              aria-invalid={tokenAddress.length > 0 && !validToken}
            />
            {symbol && <span className="suffix">{symbol}</span>}
          </div>

          <label htmlFor="amount">
            How many tokens you want to mint<span className="req">*</span>
          </label>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            aria-invalid={!!amountError}
          />

          <label htmlFor="recipient">
            Enter the address where the tokens will be minted<span className="req">*</span>
          </label>
          <input
            id="recipient"
            autoComplete="off"
            spellCheck={false}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x..."
            aria-invalid={recipient.length > 0 && !validRecipient}
          />
          {address && !recipient && (
            <button type="button" className="link" onClick={() => setRecipient(address)}>
              Use connected wallet
            </button>
          )}

          <button type="submit" className="primary" disabled={submitDisabled}>
            {!address
              ? 'Connect wallet to mint'
              : sending
                ? 'Confirm in wallet…'
                : confirming
                  ? 'Confirming…'
                  : 'Mint Tokens'}
          </button>

          {hint && <p className={hint.kind === 'error' ? 'error' : 'status'}>{hint.text}</p>}
          {hash && (
            <p className="status">
              {confirmed ? 'Mint successful — tx ' : 'Submitted — tx '}
              <code>{`${hash.slice(0, 10)}…${hash.slice(-8)}`}</code>
              {confirmed && (
                <button type="button" className="link" onClick={() => reset()}>
                  Mint another
                </button>
              )}
            </p>
          )}
        </form>
      </main>
    </>
  )
}

export default App
