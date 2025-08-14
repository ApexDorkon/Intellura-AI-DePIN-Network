// src/components/ConnectWallet.tsx
import { useEffect, useState } from 'react'
import { BrowserProvider, getAddress } from 'ethers'
import { getWalletNonce, connectWallet } from '../lib/api'

type Props = {
  onClose: () => void
  onConnected?: (address: string) => void
  afterSave?: () => void | Promise<void>
}

declare global {
  interface Window {
    ethereum?: any
  }
}

const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

export default function ConnectWallet({ onClose, onConnected, afterSave }: Props) {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Soft-read current wallet + listen for changes
  useEffect(() => {
    if (!window.ethereum) return
    let off = () => {}
    ;(async () => {
      try {
        const provider = new BrowserProvider(window.ethereum)
        const net = await provider.getNetwork().catch(() => null)
        if (net) setChainId(Number(net.chainId))

        const accs: string[] = await window.ethereum.request?.({ method: 'eth_accounts' })
        if (accs?.[0]) setAddress(getAddress(accs[0]))

        const onAccountsChanged = (accs: string[]) =>
          setAddress(accs?.[0] ? getAddress(accs[0]) : '')
        const onChainChanged = () => window.location.reload()

        window.ethereum.on?.('accountsChanged', onAccountsChanged)
        window.ethereum.on?.('chainChanged', onChainChanged)
        off = () => {
          window.ethereum.removeListener?.('accountsChanged', onAccountsChanged)
          window.ethereum.removeListener?.('chainChanged', onChainChanged)
        }
      } catch {}
    })()
    return () => off()
  }, [])

  const connect = async () => {
    if (!window.ethereum) {
      setError('No wallet detected. Install MetaMask or a compatible wallet.')
      return
    }
    try {
      setConnecting(true)
      setError(null)
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      setAddress(getAddress(addr))
      const net = await provider.getNetwork().catch(() => null)
      if (net) setChainId(Number(net.chainId))
    } catch (e: any) {
      // user rejected = silent
      if (e?.code === 4001 || String(e?.message || '').toLowerCase().includes('user rejected')) return
      setError(e?.message || 'Failed to connect wallet.')
    } finally {
      setConnecting(false)
    }
  }

  const signAndLink = async () => {
    if (!window.ethereum || !address) return
    try {
      setSigning(true)
      setError(null)

      // 1) get nonce for this address
      const { nonce } = await getWalletNonce(address)

      // 2) sign message
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const message = `Sign this nonce to authenticate: ${nonce}`
      const signature = await signer.signMessage(message)

      // 3) send to backend
      await connectWallet(address, signature)

      onConnected?.(address)
      await Promise.resolve(afterSave?.())
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to link wallet.')
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B0D12]/80 p-5 text-white shadow-2xl backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connect your wallet</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-white/70 hover:bg-white/10">✕</button>
        </div>

        {!window.ethereum ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/80">
              No browser wallet detected. Install{' '}
              <a className="underline hover:text-white" href="https://metamask.io" target="_blank" rel="noreferrer">
                MetaMask
              </a>{' '}and try again.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70">Status</div>
              <div className="mt-1 text-sm">
                {address ? (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connected: {short(address)}</span>
                    {chainId && <span className="text-white/50">Chain ID: {chainId}</span>}
                  </div>
                ) : (
                  <span className="text-white/60">No wallet connected</span>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={connect}
                disabled={connecting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition hover:bg-gray-200 disabled:opacity-60"
              >
                {connecting ? 'Connecting…' : '🦊 Connect MetaMask'}
              </button>

              <button
                onClick={signAndLink}
                disabled={!address || signing}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                {signing ? 'Linking…' : 'Sign & Link Wallet'}
              </button>

              <button
                onClick={onClose}
                className="mt-1 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}