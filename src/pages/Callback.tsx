import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Callback() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  useEffect(() => {
    ;(async () => {
      await refresh()     // calls /me with cookies
      navigate('/', { replace: true })
    })()
  }, [refresh, navigate])

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <p className="text-white/80">Finalizing sign-in…</p>
    </div>
  )
}
