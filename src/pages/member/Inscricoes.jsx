import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function MemberInscricoes() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [tab, setTab] = useState('proximas')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase
      .from('enrollments')
      .select('*, classes(name, scheduled_at, duration_min, location, type, profiles(full_name))')
      .eq('member_id', profile?.id)
      .order('created_at', { ascending: false })
    setEnrollments(data || [])
    setLoading(false)
  }

  async function cancel(id, classId) {
    if (!window.confirm('Tens a certeza que queres cancelar esta inscrição?')) return
    // DELETE so the trigger updates enrolled_count correctly
    await supabase.from('enrollments').delete().eq('id', id)
    setEnrollments(prev => prev.filter(e => e.id !== id))
  }

  const now = new Date()
  const proximas = enrollments.filter(e => e.classes?.scheduled_at && new Date(e.classes.scheduled_at) > now)
  const passadas = enrollments.filter(e => e.classes?.scheduled_at && new Date(e.classes.scheduled_at) <= now)
  const tabData = { proximas, passadas }
  const current = tabData[tab] || []

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Minhas inscrições</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Aulas em que estás inscrita</p>

      {/* Summary */}
      <div className="stats-grid mb-6">
        <div className="stat-card"><div className="stat-label">Próximas inscrições</div><div className="stat-value">{proximas.length}</div></div>
        <div className="stat-card green"><div className="stat-label">Aulas concluídas</div><div className="stat-value">{passadas.length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[['proximas', `Próximas (${proximas.length})`], ['passadas', `Passadas (${passadas.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400,
            color: tab === key ? 'var(--primary)' : 'var(--t2)',
            borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'transparent', fontSize: 14,
          }}>{label}</button>
        ))}
      </div>

      {current.length === 0
        ? <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Sem inscrições nesta categoria</div>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 6 }}>Vai a "Aulas disponíveis" para te inscrever.</p>
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {current.map(e => (
              <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, borderLeft: '4px solid var(--primary)', padding: '16px 20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{e.classes?.name}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 12, marginBottom: 2 }}>👤 {e.classes?.profiles?.full_name}</div>
                  <div style={{ color: 'var(--t3)', fontSize: 12 }}>
                    📅 {e.classes?.scheduled_at ? new Date(e.classes.scheduled_at).toLocaleString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    {e.classes?.duration_min && ` · ${e.classes.duration_min}min`}
                    {e.classes?.location && ` · 📍 ${e.classes.location}`}
                  </div>
                </div>
                <span className="badge badge-green">Confirmada</span>
                {tab === 'proximas' && <button className="btn btn-sm btn-danger" onClick={() => cancel(e.id, e.class_id)}>Cancelar</button>}
              </div>
            ))}
          </div>
      }
    </div>
  )
}
