import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('membro')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) { setError('Email ou password incorretos.'); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const r = profile?.role
    if (r === 'admin') navigate('/admin/dashboard')
    else if (r === 'instrutor') navigate('/instrutor/dashboard')
    else navigate('/membro/dashboard')
    setLoading(false)
  }

  const testAccounts = {
    admin: { label: 'Admin', email: 'admin@fittrack.pt' },
    instrutor: { label: 'Instrutor', email: 'instrutor@fittrack.pt' },
    membro: { label: 'Membro', email: 'membro@fittrack.pt' },
  }

  function selectTestAccount(value) {
    setRole(value)
    setEmail(testAccounts[value].email)
    setPassword('fittrack123')
    setError('')
  }

  const features = ['Áreas separadas por papel','Treino personalizado em 3 passos','Gestão de aulas, inscrições e equipamentos']

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <div style={{ width:44, height:44, background:'rgba(255,255,255,0.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'white', backdropFilter:'blur(4px)' }}>F</div>
            <span style={{ fontSize:22, fontWeight:700, color:'white', letterSpacing:'-0.5px' }}>FitTrack</span>
          </div>
          <h1 style={{ fontSize:36, fontWeight:750, color:'white', lineHeight:1.15, marginBottom:16, letterSpacing:'-1px' }}>Gestão de academia</h1>
          <p style={{ color:'#C7D2FE', fontSize:15, lineHeight:1.7, marginBottom:40 }}>Plataforma para membros, instrutores e administradores.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {features.map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(165,180,252,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:'#A5B4FC', fontSize:11, fontWeight:700 }}>✓</span>
                </div>
                <span style={{ color:'#E0E7FF', fontSize:14 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:60, padding:'20px 24px', background:'rgba(255,255,255,0.06)', borderRadius:14, backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color:'#A5B4FC', fontSize:12, marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Contas de teste</p>
            {Object.values(testAccounts).map(({ email: accountEmail, label }) => (
              <div key={accountEmail} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:'#C7D2FE', fontSize:13 }}>{accountEmail}</span>
                <span style={{ color:'#818CF8', fontSize:12, fontWeight:600 }}>{label}</span>
              </div>
            ))}
            <p style={{ color:'#6366F1', fontSize:12, marginTop:6 }}>password: fittrack123</p>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form">
          <div className="login-card">
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <h2 style={{ fontSize:26, fontWeight:750, color:'var(--t1)', marginBottom:6, letterSpacing:'-0.5px' }}>Bem-vindo de volta</h2>
              <p style={{ color:'var(--t2)', fontSize:14 }}>Inicia sessão na tua conta FitTrack</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Atalho de teste</label>
                <div className="role-tabs">
                  {Object.entries(testAccounts).map(([value, account]) => (
                    <div key={value} className={`role-tab ${role===value?'active':''}`} onClick={() => selectTestAccount(value)}>{account.label}</div>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%' }} type="submit" disabled={loading}>
                {loading ? 'A entrar...' : 'Iniciar sessão'}
              </button>
            </form>

            <p style={{ textAlign:'center', marginTop:24, color:'var(--t2)', fontSize:13 }}>
              Não tens conta?{' '}
              <Link to="/register" style={{ color:'var(--primary)', fontWeight:600, textDecoration:'none' }}>Criar conta</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
