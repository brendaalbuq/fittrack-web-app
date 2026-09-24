import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function InstructorInscritos() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadClasses() }, [])

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('*')
      .eq('instructor_id', profile?.id).order('scheduled_at', { ascending: false })
    setClasses(data || [])
    setLoading(false)
  }

  async function loadMembers(cls) {
    setSelected(cls)
    const { data } = await supabase.from('enrollments')
      .select('*, profiles(full_name, email, phone)')
      .eq('class_id', cls.id)
    setMembers(data || [])
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Inscritos nas aulas</h1>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>Seleciona uma aula para ver os participantes</p>

      <div className="grid-2">
        {/* Lista de aulas */}
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
            <div className="card-title" style={{ marginBottom:0 }}>As tuas aulas ({classes.length})</div>
          </div>
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            {classes.length === 0 ? (
              <div style={{ padding:24, textAlign:'center', color:'var(--t2)' }}>Sem aulas criadas.</div>
            ) : classes.map(c => (
              <div key={c.id} onClick={() => loadMembers(c)} style={{
                padding:'14px 20px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                background: selected?.id===c.id ? 'var(--primary-light)' : 'transparent',
                borderLeft: selected?.id===c.id ? '3px solid var(--primary)' : '3px solid transparent',
                transition:'all .1s'
              }}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>{c.name}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>
                  {new Date(c.scheduled_at).toLocaleString('pt-PT',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                </div>
                <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
                  {c.enrolled_count||0}/{c.max_capacity} inscritos · {c.location||'—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de inscritos */}
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
            <div className="card-title" style={{ marginBottom:0 }}>
              {selected ? `${selected.name} — ${members.length} inscrito(s)` : 'Seleciona uma aula'}
            </div>
          </div>
          {!selected ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--t3)' }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:.4 }}>👥</div>
              Clica numa aula para ver os inscritos
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>Sem inscrições nesta aula.</div>
          ) : (
            <div>
              {members.map((m, i) => (
                <div key={m.id} style={{ padding:'14px 20px', borderBottom: i<members.length-1?'1px solid var(--border)':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{m.profiles?.full_name}</div>
                    <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>📧 {m.profiles?.email}</div>
                    {m.profiles?.phone && <div style={{ fontSize:12, color:'var(--t3)' }}>📞 {m.profiles.phone}</div>}
                  </div>
                  <span className={`badge ${m.status==='confirmed'?'badge-green':'badge-amber'}`}>{m.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
