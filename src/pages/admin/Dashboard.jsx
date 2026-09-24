import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ members: 0, instructors: 0, classes: 0, equipment: 0 })
  const [pendingPTR, setPendingPTR] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [recentMembers, setRecentMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [
      { count: members }, { count: instructors }, { count: classes }, { count: equipment },
      { data: ptrs }, { data: recent }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'membro'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instrutor'),
      supabase.from('classes').select('*', { count: 'exact', head: true }).gte('scheduled_at', new Date().toISOString()),
      supabase.from('equipment').select('*', { count: 'exact', head: true }),
      supabase.from('personal_training_requests')
        .select('*, member:profiles!member_id(full_name), instructor:profiles!instructor_id(full_name)')
        .in('overall_status', ['aguarda_admin'])
        .order('created_at').limit(5),
      supabase.from('profiles').select('*').eq('role', 'membro').order('created_at', { ascending: false }).limit(5),
    ])
    setStats({ members: members || 0, instructors: instructors || 0, classes: classes || 0, equipment: equipment || 0 })
    setPendingPTR(ptrs || [])
    setRecentMembers(recent || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Visão geral da academia — {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {/* Critical alert */}
      {pendingPTR.length > 0 && (
        <div className="alert alert-warning mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {pendingPTR.length} pedido(s) de treino personalizado aceites pelos instrutores aguardam validação da academia — atribui estúdio.</span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/pedidos-pendentes')}>Validar agora</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total de membros</div><div className="stat-value">{stats.members}</div></div>
        <div className="stat-card green"><div className="stat-label">Instrutores ativos</div><div className="stat-value">{stats.instructors}</div></div>
        <div className="stat-card amber"><div className="stat-label">Aulas agendadas</div><div className="stat-value">{stats.classes}</div></div>
        <div className="stat-card red"><div className="stat-label">Pedidos pendentes</div><div className="stat-value" style={{ color: pendingPTR.length > 0 ? 'var(--red)' : 'var(--t1)' }}>{pendingPTR.length}</div></div>
      </div>

      {/* Pending training requests */}
      <div className="flex-between mb-4">
        <div className="section-title" style={{ margin: 0 }}>Pedidos de treino a validar</div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/pedidos-pendentes')}>Ver todos</button>
      </div>
      <div className="card mb-6">
        {pendingPTR.length === 0
          ? <p style={{ color: 'var(--t2)', padding: '8px 0' }}>Sem pedidos pendentes. Tudo em dia!</p>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Membro</th><th>Instrutor</th><th>Data proposta</th><th>Formato</th><th>Ação</th></tr></thead>
                <tbody>
                  {pendingPTR.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.member?.full_name}</td>
                      <td style={{ color: 'var(--t2)' }}>{r.instructor?.full_name}</td>
                      <td style={{ color: 'var(--t2)' }}>{new Date(r.requested_at).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td><span className="badge badge-gray">{r.format}</span></td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/pedidos-pendentes')}>Validar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="section-title">Membros recentes</div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Registo</th><th>Estado</th></tr></thead>
            <tbody>
              {recentMembers.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                  <td style={{ color: 'var(--t2)' }}>{m.email}</td>
                  <td style={{ color: 'var(--t2)' }}>{m.phone || '—'}</td>
                  <td style={{ color: 'var(--t2)' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                  <td><span className={`badge ${m.active !== false ? 'badge-green' : 'badge-red'}`}>{m.active !== false ? 'Ativo' : 'Inativo'}</span></td>
                </tr>
              ))}
              {recentMembers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--t2)', padding: 24 }}>Sem membros registados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
