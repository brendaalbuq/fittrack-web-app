import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const STATUS_LABELS = {
  aguarda_instrutor: { label: 'Aguarda instrutor', badge: 'badge-amber' },
  aguarda_admin:     { label: 'Aguarda validação', badge: 'badge-blue' },
  confirmado:        { label: 'Confirmado', badge: 'badge-green' },
  rejeitado_instrutor: { label: 'Rejeitado pelo instrutor', badge: 'badge-red' },
  rejeitado_admin:   { label: 'Rejeitado pela academia', badge: 'badge-red' },
  cancelado:         { label: 'Cancelado', badge: 'badge-gray' },
}

export default function MemberTreinoPersonalizado() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [instructors, setInstructors] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ instructor_id: '', requested_at: '', duration_min: 60, format: 'Individual', objective: '', notes: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: reqs }, { data: inst }] = await Promise.all([
      supabase.from('personal_training_requests')
        .select('*, instructor:profiles!instructor_id(full_name), studio:studios(name)')
        .eq('member_id', profile?.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'instrutor').eq('active', true)
    ])
    setRequests(reqs || [])
    setInstructors(inst || [])
    setLoading(false)
  }

  async function submitRequest(e) {
    e.preventDefault()
    const { error } = await supabase.from('personal_training_requests').insert({
      ...form, member_id: profile?.id, overall_status: 'aguarda_instrutor',
      status_instructor: 'pending', status_admin: 'pending'
    })
    if (error) { setMsg('Erro ao submeter: ' + error.message); return }
    setMsg('Pedido enviado! O instrutor irá aceitar ou rejeitar em breve.')
    setShowForm(false)
    setForm({ instructor_id: '', requested_at: '', duration_min: 60, format: 'Individual', objective: '', notes: '' })
    loadData()
    setTimeout(() => setMsg(''), 5000)
  }

  async function confirmSession(id) {
    await supabase.from('personal_training_requests').update({ confirmed_member: true }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, confirmed_member: true } : r))
    setMsg('Confirmação registada!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function cancelRequest(id) {
    await supabase.from('personal_training_requests').update({ overall_status: 'cancelado' }).eq('id', id)
    loadData()
  }

  const filtered = tab === 'todos' ? requests : requests.filter(r => r.overall_status === tab)
  const pending = requests.filter(r => r.overall_status === 'aguarda_instrutor' || r.overall_status === 'aguarda_admin').length
  const needsConfirm = requests.filter(r => r.overall_status === 'confirmado' && r.confirmed_member !== true && new Date(r.requested_at) < new Date()).length

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Treino personalizado</h1>
          <p style={{ color: 'var(--t2)' }}>Solicita sessões individuais com os nossos instrutores</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Novo pedido</button>
      </div>

      {/* Alerts */}
      {pending > 0 && (
        <div className="alert alert-warning mb-4">
          ⏳ Tens {pending} pedido(s) em análise — aguarda resposta do instrutor ou da academia.
        </div>
      )}
      {needsConfirm > 0 && (
        <div className="alert alert-success mb-4">
          ✅ Tens {needsConfirm} sessão(ões) para confirmar que ocorreram — confirma abaixo.
        </div>
      )}
      {msg && <div className={`alert ${msg.includes('Erro') ? 'alert-error' : 'alert-success'} mb-4`}>{msg}</div>}

      {/* Workflow explanation */}
      <div className="card mb-6" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary-mid)' }}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
          {[
            ['1', 'Submetes o pedido', 'Escolhes instrutor, data e objetivo'],
            ['2', 'Instrutor responde', 'Aceita ou rejeita em 48h'],
            ['3', 'Academia valida', 'Confirma e atribui estúdio'],
          ].map(([num, title, desc], i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 12px', borderRight: i < 2 ? '1px solid var(--primary-mid)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>{num}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-dark)', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--primary-dark)', opacity: 0.8 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-title">Novo pedido de treino personalizado</div>
          <form onSubmit={submitRequest}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Instrutor</label>
                <select className="form-select" value={form.instructor_id} onChange={e => set('instructor_id', e.target.value)} required>
                  <option value="">Selecionar instrutor...</option>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Formato</label>
                <select className="form-select" value={form.format} onChange={e => set('format', e.target.value)}>
                  <option>Individual</option>
                  <option>Dueto</option>
                  <option>Trio</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data e hora proposta</label>
                <input className="form-input" type="datetime-local" value={form.requested_at} onChange={e => set('requested_at', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Duração (minutos)</label>
                <select className="form-select" value={form.duration_min} onChange={e => set('duration_min', parseInt(e.target.value))}>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Objetivo da sessão</label>
              <input className="form-input" placeholder="ex: Melhorar técnica de agachamento, treino de força..." value={form.objective} onChange={e => set('objective', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Notas adicionais (opcional)</label>
              <textarea className="form-input" rows={2} placeholder="Lesões a ter em conta, preferências..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" type="submit">Enviar pedido</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['todos', 'Todos'], ['aguarda_instrutor', 'Aguarda instrutor'], ['aguarda_admin', 'Aguarda validação'], ['confirmado', 'Confirmados'], ['rejeitado_instrutor', 'Rejeitados']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, color: tab === key ? 'var(--primary)' : 'var(--t2)', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', background: 'transparent', fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {filtered.length === 0
        ? <div className="empty-state"><div className="empty-state-title">Sem pedidos nesta categoria</div><p>Clica em "Novo pedido" para solicitar uma sessão.</p></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(r => {
              const st = STATUS_LABELS[r.overall_status] || { label: r.overall_status, badge: 'badge-gray' }
              const sessionPast = new Date(r.requested_at) < new Date()
              const needsMemberConfirm = r.overall_status === 'confirmado' && sessionPast && !r.confirmed_member
              return (
                <div key={r.id} className="card" style={{ borderLeft: `4px solid ${r.overall_status === 'confirmado' ? 'var(--green)' : r.overall_status.includes('rejeitado') ? 'var(--red)' : 'var(--primary)'}` }}>
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Treino {r.format} — {r.instructor?.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                        {new Date(r.requested_at).toLocaleString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {r.duration_min} min
                        {r.studio?.name && ` · ${r.studio.name}`}
                      </div>
                    </div>
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                  </div>
                  {r.objective && <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>Objetivo: {r.objective}</div>}

                  {/* Workflow status tracker */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {[
                      ['Pedido submetido', true],
                      ['Instrutor', r.status_instructor === 'accepted' ? true : r.status_instructor === 'rejected' ? 'rejected' : false],
                      ['Academia', r.status_admin === 'validated' ? true : r.status_admin === 'rejected' ? 'rejected' : false],
                    ].map(([label, done], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: done === true ? 'var(--green)' : done === 'rejected' ? 'var(--red)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', flexShrink: 0 }}>
                          {done === true ? '✓' : done === 'rejected' ? '✗' : i + 1}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--t2)' }}>{label}</span>
                        {i < 2 && <div style={{ width: 20, height: 1, background: 'var(--border)' }} />}
                      </div>
                    ))}
                  </div>

                  {r.instructor_notes && <div style={{ fontSize: 12, color: 'var(--t2)', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, marginBottom: 8 }}>Resposta do instrutor: "{r.instructor_notes}"</div>}
                  {r.admin_notes && <div style={{ fontSize: 12, color: 'var(--t2)', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, marginBottom: 8 }}>Nota da academia: "{r.admin_notes}"</div>}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {needsMemberConfirm && (
                      <button className="btn btn-sm btn-success" onClick={() => confirmSession(r.id)}>Confirmar que a sessão ocorreu</button>
                    )}
                    {r.confirmed_member && r.overall_status === 'confirmado' && (
                      <span className="badge badge-green">Sessão confirmada por ti ✓</span>
                    )}
                    {r.overall_status === 'aguarda_instrutor' && (
                      <button className="btn btn-sm btn-danger" onClick={() => cancelRequest(r.id)}>Cancelar pedido</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
      }
    </div>
  )
}
