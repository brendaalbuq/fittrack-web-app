import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function InstructorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [trainings, setTrainings] = useState([])
  const [pendingPTR, setPendingPTR] = useState([])
  const [needsConfirm, setNeedsConfirm] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const now = new Date().toISOString()
    const [{ data: cls }, { data: ptrs }] = await Promise.all([
      supabase.from('classes').select('*').eq('instructor_id', profile?.id)
        .gte('scheduled_at', now).order('scheduled_at').limit(6),
      supabase.from('personal_training_requests')
        .select('*, member:profiles!member_id(full_name, phone), studio:studios(name)')
        .eq('instructor_id', profile?.id).order('requested_at'),
    ])
    const allPTR = ptrs || []
    setClasses(cls || [])
    setPendingPTR(allPTR.filter(r => r.status_instructor === 'pending'))
    setNeedsConfirm(allPTR.filter(r => r.overall_status === 'confirmado' && !r.confirmed_instructor && new Date(r.requested_at) < new Date()))
    setTrainings(allPTR.filter(r => r.overall_status === 'confirmado' && new Date(r.requested_at) >= new Date()))
    setLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Instrutor'

  // Juntar aulas + treinos numa timeline ordenada por data
  const allUpcoming = [
    ...classes.map(c => ({ ...c, _type: 'class', _date: new Date(c.scheduled_at) })),
    ...trainings.map(t => ({ ...t, _type: 'training', _date: new Date(t.requested_at) })),
  ].sort((a, b) => a._date - b._date)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Bom dia, {firstName} 👋</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Aqui está o teu resumo de hoje</p>

      {/* Alertas críticos */}
      {pendingPTR.length > 0 && (
        <div className="alert alert-warning mb-4" style={{ justifyContent: 'space-between' }}>
          <span>⚠️ Tens <strong>{pendingPTR.length}</strong> pedido(s) de treino personalizado por responder — prazo de 48h.</span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/instrutor/pedidos-treino')}>Responder agora</button>
        </div>
      )}
      {needsConfirm.length > 0 && (
        <div className="alert alert-success mb-4" style={{ justifyContent: 'space-between' }}>
          <span>✅ Tens <strong>{needsConfirm.length}</strong> sessão(ões) para confirmar que ocorreram.</span>
          <button className="btn btn-sm" style={{ background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={() => navigate('/instrutor/pedidos-treino')}>Confirmar</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Aulas agendadas</div><div className="stat-value">{classes.length}</div></div>
        <div className="stat-card" style={{ '--before-color': 'var(--primary)' }}>
          <div className="stat-label">Treinos confirmados</div><div className="stat-value" style={{ color: 'var(--primary)' }}>{trainings.length}</div>
        </div>
        <div className="stat-card amber"><div className="stat-label">Por responder</div><div className="stat-value" style={{ color: pendingPTR.length > 0 ? 'var(--amber)' : 'var(--t1)' }}>{pendingPTR.length}</div></div>
        <div className="stat-card red"><div className="stat-label">A confirmar</div><div className="stat-value" style={{ color: needsConfirm.length > 0 ? 'var(--red)' : 'var(--t1)' }}>{needsConfirm.length}</div></div>
      </div>

      {/* Timeline completa: aulas + treinos juntos */}
      <div className="flex-between mb-4">
        <div className="section-title" style={{ margin: 0 }}>Próximos compromissos</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:10,height:10,borderRadius:3,background:'var(--blue)',display:'inline-block' }}/>Aula de grupo</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:10,height:10,borderRadius:3,background:'var(--primary)',display:'inline-block' }}/>Treino personalizado</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {allUpcoming.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--t2)' }}>Sem compromissos agendados.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Tipo</th>
                  <th>Nome / Membro</th>
                  <th>Data e hora</th>
                  <th>Local</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {allUpcoming.map((item, i) => {
                  const isClass = item._type === 'class'
                  return (
                    <tr key={i}>
                      <td>
                        <span className={`badge ${isClass ? 'badge-blue' : 'badge-purple'}`} style={{ display:'flex', alignItems:'center', gap:6, width:'fit-content' }}>
                          <span style={{ width:8,height:8,borderRadius:2,background:isClass?'var(--blue)':'var(--primary)',flexShrink:0 }}/>
                          {isClass ? 'Aula' : 'Treino'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {isClass ? item.name : `${item.format} — ${item.member?.full_name}`}
                      </td>
                      <td style={{ color: 'var(--t2)' }}>
                        {item._date.toLocaleString('pt-PT', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td style={{ color: 'var(--t2)' }}>
                        {isClass ? (item.location || '—') : (item.studio?.name || 'A atribuir')}
                      </td>
                      <td style={{ color: 'var(--t3)', fontSize: 12 }}>
                        {isClass ? `${item.enrolled_count || 0}/${item.max_capacity} inscritos · ${item.duration_min}min` : `${item.duration_min}min · ${item.objective ? item.objective.slice(0,40) + (item.objective.length > 40 ? '…' : '') : '—'}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pedidos de treino recentes pendentes */}
      {pendingPTR.length > 0 && (
        <>
          <div className="section-title mt-6">Pedidos a aguardar resposta</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingPTR.map(r => (
              <div key={r.id} className="card" style={{ borderLeft: '4px solid var(--amber)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.member?.full_name} — Treino {r.format}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                    {new Date(r.requested_at).toLocaleString('pt-PT', { weekday:'long', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })} · {r.duration_min}min
                    {r.objective && ` · "${r.objective}"`}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/instrutor/pedidos-treino')}>Responder</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
