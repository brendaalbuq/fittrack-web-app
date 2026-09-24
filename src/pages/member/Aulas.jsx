import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const CLASS_COLORS = { Yoga: 'var(--green)', Spinning: 'var(--primary)', Pilates: 'var(--amber)', CrossFit: 'var(--red)', Natação: 'var(--primary)' }

export default function MemberAulas() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [myEnrollments, setMyEnrollments] = useState([])
  const [filter, setFilter] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(null)
  const [msg, setMsg] = useState('')

  const filters = ['Todas', 'Yoga', 'Spinning', 'Pilates', 'CrossFit', 'Natação']

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: cls } = await supabase
      .from('classes').select('*, profiles(full_name)')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at').limit(20)
    setClasses(cls || [])

    const { data: enr } = await supabase
      .from('enrollments').select('class_id')
      .eq('member_id', profile?.id)
    setMyEnrollments((enr || []).map(e => e.class_id))
    setLoading(false)
  }

  async function enroll(classId) {
    setEnrolling(classId)
    const { error } = await supabase.from('enrollments').insert({
      class_id: classId, member_id: profile?.id, status: 'confirmed'
    })
    if (error) setMsg('Erro ao inscrever. Tenta novamente.')
    else { setMsg('Inscrição confirmada!'); setMyEnrollments(prev => [...prev, classId]) }
    setEnrolling(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function cancelEnroll(classId) {
    await supabase.from('enrollments').delete()
      .eq('class_id', classId).eq('member_id', profile?.id)
    setMyEnrollments(prev => prev.filter(id => id !== classId))
  }

  const filtered = filter === 'Todas' ? classes : classes.filter(c => c.type === filter)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Aulas disponíveis</h1>
          <p style={{ color: 'var(--t2)' }}>Inscreve-te nas aulas da tua preferência</p>
        </div>
      </div>

      {msg && <div className={`alert ${msg.includes('Erro') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="btn btn-sm"
            style={{ background: filter === f ? 'var(--primary)' : 'var(--surface)', color: filter === f ? 'white' : 'var(--t2)', border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}` }}>
            {f}
          </button>
        ))}
      </div>

      {/* Classes grid */}
      {filtered.length === 0
        ? <div className="empty-state"><div className="empty-state-title">Sem aulas disponíveis</div></div>
        : <div className="grid-3">
            {filtered.map(cls => {
              const isEnrolled = myEnrollments.includes(cls.id)
              const isFull = cls.enrolled_count >= cls.max_capacity
              const color = CLASS_COLORS[cls.type] || 'var(--primary)'
              const spotsLeft = cls.max_capacity - (cls.enrolled_count || 0)
              return (
                <div key={cls.id} className="class-card" style={{ borderLeftColor: color }}>
                  <div className="flex-between" style={{ marginBottom: 6 }}>
                    <div className="class-name">{cls.name}</div>
                    {cls.type && <span className="badge badge-gray">{cls.type}</span>}
                  </div>
                  <div className="class-meta">👤 {cls.profiles?.full_name || 'N/D'}</div>
                  <div className="class-meta">📅 {new Date(cls.scheduled_at).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div className="class-meta">⏰ {new Date(cls.scheduled_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} · {cls.duration_min}min</div>
                  <div className="class-meta">📍 {cls.location || 'Studio'}</div>

                  <div className="flex-between" style={{ marginTop: 12 }}>
                    <span className={`badge ${isFull ? 'badge-red' : spotsLeft < 4 ? 'badge-amber' : 'badge-green'}`}>
                      {isFull ? 'Lotado' : `${spotsLeft} vagas`}
                    </span>
                    {isEnrolled
                      ? <button className="btn btn-sm btn-danger" onClick={() => cancelEnroll(cls.id)}>Cancelar</button>
                      : <button className="btn btn-sm btn-primary" onClick={() => enroll(cls.id)}
                          disabled={isFull || enrolling === cls.id}>
                          {enrolling === cls.id ? '...' : 'Inscrever'}
                        </button>
                    }
                  </div>
                </div>
              )
            })}
          </div>
      }
    </div>
  )
}
