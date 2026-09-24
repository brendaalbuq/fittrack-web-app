import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function MemberDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [myClasses, setMyClasses] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [trainingReqs, setTrainingReqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: enr }, { data: cls }, { data: ptr }] = await Promise.all([
      // My enrolled classes (upcoming)
      supabase.from('enrollments')
        .select('*, classes(name, scheduled_at, duration_min, location, type, profiles(full_name))')
        .eq('member_id', profile?.id)
        .gte('classes.scheduled_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(4),
      // Available classes to suggest
      supabase.from('classes').select('*, profiles(full_name)')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at').limit(3),
      // My training requests
      supabase.from('personal_training_requests')
        .select('*, instructor:profiles!instructor_id(full_name), studio:studios(name)')
        .eq('member_id', profile?.id)
        .order('created_at', { ascending: false }).limit(5),
    ])
    // Filter enrollments that have classes with future dates
    const futureEnr = (enr || []).filter(e => e.classes?.scheduled_at && new Date(e.classes.scheduled_at) > new Date())
    setMyClasses(futureEnr)
    setAvailableClasses(cls || [])
    setTrainingReqs(ptr || [])
    setLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Atleta'
  const now = new Date()
  const weekday = now.toLocaleDateString('pt-PT', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

  const pendingPTR = trainingReqs.filter(r => ['aguarda_instrutor','aguarda_admin'].includes(r.overall_status))
  const confirmedPTR = trainingReqs.filter(r => r.overall_status === 'confirmado')
  const needsConfirm = trainingReqs.filter(r => r.overall_status === 'confirmado' && !r.confirmed_member && new Date(r.requested_at) < now)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Bom dia, {firstName} 👋</h1>
          <p style={{ color: 'var(--t2)' }}>{weekday.charAt(0).toUpperCase() + weekday.slice(1)}, {dateStr}</p>
        </div>
      </div>

      {needsConfirm.length > 0 && (
        <div className="alert alert-success mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ Tens {needsConfirm.length} sessão(ões) de treino para confirmar que ocorreram.</span>
          <button className="btn btn-sm" style={{ background: 'var(--green)', color: 'white', border: 'none' }} onClick={() => navigate('/membro/treino-personalizado')}>Confirmar agora</button>
        </div>
      )}
      {pendingPTR.length > 0 && (
        <div className="alert alert-warning mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⏳ {pendingPTR.length} pedido(s) de treino em análise.</span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/membro/treino-personalizado')}>Ver estado</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Inscrições ativas</div><div className="stat-value">{myClasses.length}</div></div>
        <div className="stat-card green"><div className="stat-label">Treinos confirmados</div><div className="stat-value">{confirmedPTR.length}</div></div>
        <div className="stat-card amber"><div className="stat-label">Pedidos em análise</div><div className="stat-value">{pendingPTR.length}</div></div>
      </div>

      {/* Quick actions */}
      <div className="section-title">Ações rápidas</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/membro/aulas')}>Ver aulas disponíveis</button>
        <button className="btn btn-secondary" onClick={() => navigate('/membro/treino-personalizado')}>Pedir treino personalizado</button>
        <button className="btn btn-secondary" onClick={() => navigate('/membro/inscricoes')}>As minhas inscrições</button>
      </div>

      {/* My upcoming enrolled classes */}
      <div className="section-title">As minhas próximas aulas</div>
      {myClasses.length === 0
        ? <div className="card mb-6" style={{ textAlign: 'center', padding: 32, color: 'var(--t2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>📅</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Sem aulas agendadas</div>
            <p style={{ fontSize: 13 }}>Inscreve-te numa aula para a veres aqui.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/membro/aulas')}>Explorar aulas</button>
          </div>
        : <div className="grid-2 mb-6">
            {myClasses.slice(0, 4).map((e, i) => (
              <div key={e.id} className="class-card" style={{ borderLeftColor: ['var(--green)','var(--primary)','var(--amber)','var(--blue)'][i % 4] }}>
                <div className="class-name">{e.classes?.name}</div>
                <div className="class-meta">👤 {e.classes?.profiles?.full_name}</div>
                <div className="class-meta">📅 {new Date(e.classes.scheduled_at).toLocaleString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="class-meta">⏱ {e.classes?.duration_min}min{e.classes?.location ? ` · 📍 ${e.classes.location}` : ''}</div>
                <div style={{ marginTop: 10 }}>
                  <span className="badge badge-green">Inscrita ✓</span>
                </div>
              </div>
            ))}
          </div>
      }

      {/* Training requests */}
      {trainingReqs.length > 0 && (
        <>
          <div className="flex-between mb-4">
            <div className="section-title" style={{ margin: 0 }}>Treinos personalizados recentes</div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/membro/treino-personalizado')}>Ver todos</button>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Instrutor</th><th>Data proposta</th><th>Formato</th><th>Estúdio</th><th>Estado</th></tr></thead>
                <tbody>
                  {trainingReqs.slice(0, 5).map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.instructor?.full_name}</td>
                      <td style={{ color: 'var(--t2)' }}>{new Date(r.requested_at).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ color: 'var(--t2)' }}>{r.format}</td>
                      <td style={{ color: 'var(--t2)' }}>{r.studio?.name || '—'}</td>
                      <td>
                        <span className={`badge ${r.overall_status === 'confirmado' ? 'badge-green' : r.overall_status.includes('rejeitado') ? 'badge-red' : r.overall_status === 'aguarda_admin' ? 'badge-blue' : 'badge-amber'}`}>
                          {r.overall_status === 'aguarda_instrutor' ? 'Aguarda instrutor' : r.overall_status === 'aguarda_admin' ? 'Aguarda academia' : r.overall_status === 'confirmado' ? 'Confirmado' : 'Rejeitado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
