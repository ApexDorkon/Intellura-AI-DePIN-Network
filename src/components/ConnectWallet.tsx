// src/components/ConnectWallet.tsx
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { setWallet as setWalletAPI } from '../lib/api'

type Props = {
  onClose: () => void
  onConnected?: (address: string) => void
  afterSave?: () => void | Promise<void> // e.g. refresh right column in JoinPanel
}

declare global {
  interface Window {
    ethereum?: any
  }
}

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

export default function ConnectWallet({ onClose, onConnected, afterSave }: Props) {
  const [address, setAddress] = useState<string>('')
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Attempt a soft read of currently selected account (if already connected)
  useEffect(() => {
    let unsub = () => {}
    const init = async () => {
      if (!window.ethereum) return
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const network = await provider.getNetwork().catch(() => null)
        if (network) setChainId(Number(network.chainId))

        // if they already granted access
        const accounts: string[] = await window.ethereum.request?.({ method: 'eth_accounts' })
        if (accounts?.[0]) setAddress(ethers.getAddress(accounts[0]))

        // react to account/chain changes
        const onAccountsChanged = (accs: string[]) => setAddress(accs?.[0] ? ethers.getAddress(accs[0]) : '')
        const onChainChanged = (_hex: string) => window.location.reload()

        window.ethereum.on?.('accountsChanged', onAccountsChanged)
        window.ethereum.on?.('chainChanged', onChainChanged)
        unsub = () => {
          window.ethereum.removeListener?.('accountsChanged', onAccountsChanged)
          window.ethereum.removeListener?.('chainChanged', onChainChanged)
        }
      } catch {}
    }
    init()
    return () => unsub()
  }, [])

  const connect = async () => {
    if (!window.ethereum) {
      setError('No wallet detected. Please install MetaMask or a compatible wallet.')
      return
    }
    try {
      setConnecting(true)
      setError(null)
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      setAddress(ethers.getAddress(addr))
      const network = await provider.getNetwork().catch(() => null)
      if (network) setChainId(Number(network.chainId))
    } catch (e: any) {
      // user rejected is fine, keep quiet
      if (e?.code === 4001 || String(e?.message || '').toLowerCase().includes('user rejected')) return
      setError(e?.message || 'Failed to connect wallet.')
    } finally {
      setConnecting(false)
    }
  }

  const saveWallet = async () => {
    if (!address) return
    try {
      setSaving(true)
      setError(null)
      await setWalletAPI(address) // cookie-auth; no headers needed
      onConnected?.(address)
      await Promise.resolve(afterSave?.())
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to save wallet.')
    } finally {
      setSaving(false)
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
              </a>{' '}
              or a compatible wallet, then try again.
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
                onClick={saveWallet}
                disabled={!address || saving}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save this wallet'}
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
