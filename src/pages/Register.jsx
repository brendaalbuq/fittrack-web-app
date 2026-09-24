import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../lib/supabase'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', birth_date: '', role: 'membro' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, {
      full_name: form.full_name, phone: form.phone,
      birth_date: form.birth_date, role: form.role,
    })
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 560, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>FitTrack</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Criar conta</h1>
          <p style={{ color: 'var(--t2)' }}>Junta-te à FitTrack hoje</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" type="text" placeholder="João Silva"
              value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="joao@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" type="tel" placeholder="+351 912 345 678"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Data de nascimento</label>
              <input className="form-input" type="date"
                value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de conta</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['membro', 'Membro'], ['instrutor', 'Instrutor']].map(([val, label]) => (
                <div key={val} onClick={() => set('role', val)} style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  border: `2px solid ${form.role === val ? 'var(--primary)' : 'var(--border)'}`,
                  background: form.role === val ? 'var(--primary-light)' : 'var(--bg)',
                  textAlign: 'center', fontWeight: form.role === val ? 600 : 400,
                  color: form.role === val ? 'var(--primary-dark)' : 'var(--t2)',
                }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 16, justifyContent: 'center' }}
            type="submit" disabled={loading}>
            {loading ? 'A criar conta...' : 'Criar conta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--t2)', fontSize: 14 }}>
          Já tens conta?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Iniciar sessão
          </Link>
        </p>
      </div>
    </div>
  )
}
