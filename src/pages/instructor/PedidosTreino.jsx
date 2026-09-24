import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

function RejectModal({ onConfirm, onCancel }) {
  const [notes, setNotes] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div className="card" style={{ width:440, padding:28, boxShadow:'0 20px 60px rgba(15,23,42,0.2)' }}>
        <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>Rejeitar pedido</h3>
        <p style={{ color:'var(--t2)', fontSize:14, marginBottom:16 }}>O membro será notificado da rejeição.</p>
        <div className="form-group">
          <label className="form-label">Motivo (recomendado)</label>
          <textarea className="form-input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ex: Não tenho disponibilidade nesse horário..." style={{ resize:'none' }} autoFocus />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => onConfirm(notes)}>Rejeitar pedido</button>
        </div>
      </div>
    </div>
  )
}

export default function InstructorPedidosTreino() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('pending')
  const [rejectModal, setRejectModal] = useState(null) // requestId

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase
      .from('personal_training_requests')
      .select('*, member:profiles!member_id(full_name, phone, email), studio:studios(name)')
      .eq('instructor_id', profile?.id)
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function respond(id, accept, notes = '') {
    const { error } = await supabase.from('personal_training_requests').update({
      status_instructor: accept ? 'accepted' : 'rejected',
      instructor_response_at: new Date().toISOString(),
      instructor_notes: notes,
    }).eq('id', id)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg(accept ? 'Pedido aceite! A academia irá validar e atribuir estúdio.' : 'Pedido rejeitado.')
    loadData()
    setTimeout(() => setMsg(''), 4000)
  }

  async function confirmSessionDone(id) {
    await supabase.from('personal_training_requests').update({ confirmed_instructor: true }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, confirmed_instructor: true } : r))
    setMsg('Sessão confirmada! Aguarda confirmação do membro.')
    setTimeout(() => setMsg(''), 3000)
  }

  const pending = requests.filter(r => r.status_instructor === 'pending')
  const accepted = requests.filter(r => r.status_instructor === 'accepted')
  const rejected = requests.filter(r => r.status_instructor === 'rejected')
  const needsConfirm = accepted.filter(r => r.overall_status === 'confirmado' && !r.confirmed_instructor && new Date(r.requested_at) < new Date())

  const tabData = { pending, accepted, rejected }
  const current = tabData[tab] || []

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Pedidos de treino personalizado</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Aceita ou rejeita os pedidos dos membros</p>

      {rejectModal && (
        <RejectModal
          onConfirm={notes => { respond(rejectModal, false, notes); setRejectModal(null) }}
          onCancel={() => setRejectModal(null)}
        />
      )}

      {/* Alert for pending */}
      {pending.length > 0 && (
        <div className="alert alert-warning mb-4">
          ⚠️ Tens {pending.length} pedido(s) a aguardar resposta tua — prazo de 48 horas.
        </div>
      )}
      {needsConfirm.length > 0 && (
        <div className="alert alert-success mb-4">
          ✅ Tens {needsConfirm.length} sessão(ões) confirmada(s) pela academia — confirma que ocorreram.
        </div>
      )}
      {msg && <div className={`alert ${msg.includes('Erro') ? 'alert-error' : 'alert-success'} mb-4`}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['pending', `Por responder (${pending.length})`], ['accepted', `Aceites (${accepted.length})`], ['rejected', `Rejeitados (${rejected.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, color: tab === key ? 'var(--primary)' : 'var(--t2)', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', background: 'transparent', fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      {current.length === 0
        ? <div className="empty-state"><div className="empty-state-title">Sem pedidos nesta categoria</div></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {current.map(r => {
              const isPast = new Date(r.requested_at) < new Date()
              const needsMyConfirm = r.overall_status === 'confirmado' && isPast && !r.confirmed_instructor
              return (
                <div key={r.id} className="card" style={{ borderLeft: `4px solid ${r.status_instructor === 'pending' ? 'var(--amber)' : r.status_instructor === 'accepted' ? 'var(--green)' : 'var(--red)'}` }}>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{r.member?.full_name} — Treino {r.format}</div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                        {new Date(r.requested_at).toLocaleString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {r.duration_min} min
                      </div>
                      {r.studio?.name && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 2 }}>Estúdio atribuído: {r.studio.name}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${r.status_instructor === 'pending' ? 'badge-amber' : r.status_instructor === 'accepted' ? 'badge-green' : 'badge-red'}`}>
                        {r.status_instructor === 'pending' ? 'Aguarda resposta' : r.status_instructor === 'accepted' ? 'Aceite' : 'Rejeitado'}
                      </span>
                      {r.overall_status === 'aguarda_admin' && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Aguarda validação da academia</div>}
                      {r.overall_status === 'confirmado' && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>Confirmado pela academia</div>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--t2)' }}>
                      <div>📧 {r.member?.email}</div>
                      <div>📞 {r.member?.phone || 'N/D'}</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t2)' }}>
                      <div>Formato: {r.format}</div>
                      <div>Duração: {r.duration_min} min</div>
                    </div>
                  </div>

                  {r.objective && <div style={{ fontSize: 13, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 12 }}>Objetivo: "{r.objective}"</div>}
                  {r.notes && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>Notas: {r.notes}</div>}

                  {/* Actions */}
                  {r.status_instructor === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success" onClick={() => respond(r.id, true)}>Aceitar pedido</button>
                      <button className="btn btn-danger" onClick={() => setRejectModal(r.id)}>Rejeitar</button>
                    </div>
                  )}

                  {needsMyConfirm && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-success" onClick={() => confirmSessionDone(r.id)}>Confirmar que a sessão ocorreu</button>
                      {r.confirmed_member && <span className="badge badge-green">Membro já confirmou ✓</span>}
                    </div>
                  )}

                  {r.confirmed_instructor && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="badge badge-green">Confirmaste que a sessão ocorreu ✓</span>
                      {r.confirmed_member
                        ? <span className="badge badge-green">Membro confirmou ✓</span>
                        : <span className="badge badge-amber">Membro ainda não confirmou</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
      }
    </div>
  )
}
