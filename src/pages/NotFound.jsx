import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function NotFound() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  function goHome() {
    if (!profile) { navigate('/login'); return }
    if (profile.role === 'admin') navigate('/admin/dashboard')
    else if (profile.role === 'instrutor') navigate('/instrutor/dashboard')
    else navigate('/membro/dashboard')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16, padding:40, textAlign:'center' }}>
      <div style={{ fontSize:72, fontWeight:800, color:'var(--primary)', letterSpacing:'-4px', lineHeight:1 }}>404</div>
      <div style={{ fontSize:22, fontWeight:700, color:'var(--t1)' }}>Página não encontrada</div>
      <p style={{ color:'var(--t2)', fontSize:15, maxWidth:360 }}>
        A página que procuras não existe ou foi movida.
      </p>
      <button className="btn btn-primary" onClick={goHome} style={{ marginTop:8 }}>
        Voltar ao início
      </button>
    </div>
  )
}
