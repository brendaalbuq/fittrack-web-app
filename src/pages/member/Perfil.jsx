import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function MemberPerfil() {
  const { profile, setProfile } = useAuth()
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPw = (k, v) => setPasswords(p => ({ ...p, [k]: v }))
  const initials = form.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true)
    const { data, error } = await supabase.from('profiles').update(form).eq('id', profile.id).select().single()
    if (error) setMsg('Erro ao guardar.')
    else { setProfile(data); setMsg('Perfil atualizado!') }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function changePassword(e) {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) { setPwMsg('As passwords não coincidem.'); return }
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    if (error) setPwMsg('Erro ao alterar password.')
    else { setPwMsg('Password alterada!'); setPasswords({ current: '', new: '', confirm: '' }) }
    setTimeout(() => setPwMsg(''), 3000)
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>O meu perfil</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Gere os teus dados pessoais</p>

      <div className="grid-2">
        {/* Profile card */}
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white', margin: '0 auto 16px' }}>{initials}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{form.full_name}</div>
          <span className="badge badge-blue" style={{ marginBottom: 16 }}>
            {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
          </span>
          <div style={{ color: 'var(--t2)', fontSize: 13 }}>
            <div>📧 {profile?.email || '—'}</div>
            <div style={{ marginTop: 4 }}>📞 {profile?.phone || 'Não definido'}</div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card">
          <div className="card-title">Editar informações</div>
          {msg && <div className={`alert ${msg.includes('Erro') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}
          <form onSubmit={saveProfile}>
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+351 912 345 678" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Guardar alterações'}</button>
          </form>
        </div>
      </div>

      {/* Password change */}
      <div className="card mt-6">
        <div className="card-title">Alterar password</div>
        {pwMsg && <div className={`alert ${pwMsg.includes('Erro') || pwMsg.includes('não') ? 'alert-error' : 'alert-success'}`}>{pwMsg}</div>}
        <form onSubmit={changePassword} style={{ maxWidth: 400 }}>
          <div className="form-group">
            <label className="form-label">Nova password</label>
            <input className="form-input" type="password" value={passwords.new} onChange={e => setPw('new', e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar nova password</label>
            <input className="form-input" type="password" value={passwords.confirm} onChange={e => setPw('confirm', e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit">Alterar password</button>
        </form>
      </div>
    </div>
  )
}
