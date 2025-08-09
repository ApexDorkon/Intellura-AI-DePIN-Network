import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API } from '../lib/api'
import { API_BASE } from '../lib/config'
export default function ReferralBounce() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true })
      return
    }
    // Send the user to the backend so it can set the ref cookie,
    // then the backend will redirect them back to the app.
    // (If your backend supports a return URL param, you can append it.)
    window.location.href = `${API}/r/${encodeURIComponent(code)}`
  }, [code, navigate])

  return (
    <div className="grid min-h-[60vh] place-items-center text-white/80">
      Linking your invite…
    </div>
  )
}
