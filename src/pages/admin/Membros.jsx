import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminMembros() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('profiles').select('*').in('role', ['membro','instrutor']).order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  function validateEdit() {
    const e = {}
    if (!editing?.full_name?.trim()) e.full_name = 'Nome obrigatório'
    return e
  }

  async function saveEdit() {
    const e = validateEdit()
    if (Object.keys(e).length) { setErrors(e); return }
    const { error } = await supabase.from('profiles')
      .update({ full_name: editing.full_name, phone: editing.phone, role: editing.role, active: editing.active })
      .eq('id', editing.id)
    if (error) setMsg('Erro ao guardar.')
    else { setMsg('Atualizado!'); setMembers(prev => prev.map(m => m.id === editing.id ? editing : m)); setEditing(null); setErrors({}) }
    setTimeout(() => setMsg(''), 3000)
  }

  async function toggleActive(member) {
    await supabase.from('profiles').update({ active: !member.active }).eq('id', member.id)
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, active: !m.active } : m))
  }

  const filtered = members
    .filter(m => filter === 'todos' || m.role === filter)
    .filter(m => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Membros</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Gestão de utilizadores da academia</p>

      {msg && <div className={`alert ${msg.includes('Erro') ? 'alert-error' : 'alert-success'} mb-4`}>{msg}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" style={{ width: 280 }} placeholder="Pesquisar por nome ou email..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos','Todos'],['membro','Membros'],['instrutor','Instrutores']].map(([v,l]) => (
            <button key={v} className="btn btn-sm" onClick={() => setFilter(v)}
              style={{ background: filter===v?'var(--primary)':'var(--surface)', color: filter===v?'white':'var(--t2)', border:`1px solid ${filter===v?'var(--primary)':'var(--border)'}` }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--t3)' }}>{filtered.length} resultado(s)</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Tipo</th><th>Telefone</th><th>Estado</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  {editing?.id === m.id ? (
                    <>
                      <td>
                        <input className="form-input" style={{ minWidth: 160 }} value={editing.full_name || ''} onChange={e => setEditing(p => ({ ...p, full_name: e.target.value }))} />
                        {errors.full_name && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{errors.full_name}</div>}
                      </td>
                      <td style={{ color: 'var(--t3)', fontSize: 12 }}>{m.email}</td>
                      <td>
                        <select className="form-select" style={{ minWidth: 100 }} value={editing.role} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}>
                          <option value="membro">Membro</option>
                          <option value="instrutor">Instrutor</option>
                        </select>
                      </td>
                      <td><input className="form-input" value={editing.phone || ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} placeholder="+351..." /></td>
                      <td><span className={`badge ${editing.active!==false?'badge-green':'badge-red'}`}>{editing.active!==false?'Ativo':'Inativo'}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={saveEdit}>Guardar</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(null); setErrors({}) }}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                      <td style={{ color: 'var(--t2)' }}>{m.email}</td>
                      <td><span className={`badge ${m.role==='instrutor'?'badge-green':'badge-blue'}`}>{m.role}</span></td>
                      <td style={{ color: 'var(--t2)' }}>{m.phone || '—'}</td>
                      <td><span className={`badge ${m.active!==false?'badge-green':'badge-red'}`}>{m.active!==false?'Ativo':'Inativo'}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditing(m)}>Editar</button>
                        <button className={`btn btn-sm ${m.active!==false?'btn-danger':'btn-success'}`} onClick={() => toggleActive(m)}>
                          {m.active!==false?'Desativar':'Ativar'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--t2)', padding: 24 }}>Sem resultados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
