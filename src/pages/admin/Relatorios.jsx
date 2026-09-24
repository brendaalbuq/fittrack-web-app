import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TYPE_COLORS = { Yoga:'#10B981', Spinning:'#6366F1', Pilates:'#F59E0B', CrossFit:'#EF4444', Natação:'#3B82F6', Musculação:'#8B5CF6', Dança:'#EC4899', Funcional:'#F97316' }

export default function AdminRelatorios() {
  const [stats, setStats] = useState({ totalMembers:0, activeClasses:0, totalEnrollments:0, totalTrainings:0, pendingRequests:0, totalEquipment:0 })
  const [topClasses, setTopClasses] = useState([])
  const [byType, setByType] = useState([])
  const [recentTrainings, setRecentTrainings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [
      { count: totalMembers }, { count: activeClasses },
      { count: totalEnrollments }, { count: totalTrainings },
      { count: pendingRequests }, { count: totalEquipment },
      { data: classes }, { data: allClasses },
      { data: trainings }
    ] = await Promise.all([
      supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','membro'),
      supabase.from('classes').select('*',{count:'exact',head:true}).gte('scheduled_at',new Date().toISOString()),
      supabase.from('enrollments').select('*',{count:'exact',head:true}),
      supabase.from('personal_training_requests').select('*',{count:'exact',head:true}).eq('overall_status','confirmado'),
      supabase.from('personal_training_requests').select('*',{count:'exact',head:true}).in('overall_status',['aguarda_instrutor','aguarda_admin']),
      supabase.from('equipment').select('*',{count:'exact',head:true}),
      supabase.from('classes').select('name,enrolled_count,max_capacity,type,location').order('enrolled_count',{ascending:false}).limit(8),
      supabase.from('classes').select('type'),
      supabase.from('personal_training_requests')
        .select('format, duration_min, overall_status, created_at, member:profiles!member_id(full_name), instructor:profiles!instructor_id(full_name)')
        .eq('overall_status','confirmado').order('created_at',{ascending:false}).limit(5),
    ])

    setStats({ totalMembers:totalMembers||0, activeClasses:activeClasses||0, totalEnrollments:totalEnrollments||0, totalTrainings:totalTrainings||0, pendingRequests:pendingRequests||0, totalEquipment:totalEquipment||0 })
    setTopClasses(classes||[])
    setRecentTrainings(trainings||[])

    const counts = {}
    ;(allClasses||[]).forEach(c => { counts[c.type] = (counts[c.type]||0)+1 })
    setByType(Object.entries(counts).sort((a,b)=>b[1]-a[1]))
    setLoading(false)
  }

  const maxCount = byType.length ? Math.max(...byType.map(([,n])=>n)) : 1

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Relatórios</h1>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>Estatísticas e indicadores da academia</p>

      {/* KPI grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        <div className="stat-card"><div className="stat-label">Total de membros</div><div className="stat-value">{stats.totalMembers}</div></div>
        <div className="stat-card green"><div className="stat-label">Aulas agendadas</div><div className="stat-value">{stats.activeClasses}</div></div>
        <div className="stat-card amber"><div className="stat-label">Total de inscrições</div><div className="stat-value">{stats.totalEnrollments}</div></div>
        <div className="stat-card" style={{'--before-color':'var(--primary)'}}><div className="stat-label">Treinos confirmados</div><div className="stat-value" style={{color:'var(--primary)'}}>{stats.totalTrainings}</div></div>
        <div className="stat-card red"><div className="stat-label">Pedidos em análise</div><div className="stat-value" style={{color:stats.pendingRequests>0?'var(--red)':'var(--t1)'}}>{stats.pendingRequests}</div></div>
        <div className="stat-card"><div className="stat-label">Itens de equipamento</div><div className="stat-value">{stats.totalEquipment}</div></div>
      </div>

      <div className="grid-2 mb-6">
        {/* Chart by type */}
        <div className="card">
          <div className="card-title">Aulas por modalidade</div>
          {byType.length === 0 ? <p style={{color:'var(--t2)'}}>Sem dados</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {byType.map(([type, count]) => (
                <div key={type}>
                  <div className="flex-between" style={{ marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{type}</span>
                    <span style={{ fontSize:13, color:'var(--t2)' }}>{count} aula{count!==1?'s':''}</span>
                  </div>
                  <div style={{ height:10, background:'var(--border)', borderRadius:5, overflow:'hidden' }}>
                    <div style={{ width:`${(count/maxCount)*100}%`, height:'100%', background:TYPE_COLORS[type]||'var(--primary)', borderRadius:5, transition:'width .5s ease' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Occupancy chart */}
        <div className="card">
          <div className="card-title">Taxa de ocupação das aulas</div>
          {topClasses.length === 0 ? <p style={{color:'var(--t2)'}}>Sem dados</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {topClasses.slice(0,6).map((c,i) => {
                const pct = c.max_capacity ? Math.round((c.enrolled_count||0)/c.max_capacity*100) : 0
                const color = pct>=90?'var(--red)':pct>=60?'var(--amber)':'var(--green)'
                return (
                  <div key={i}>
                    <div className="flex-between" style={{ marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{c.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color }}>{pct}%</span>
                    </div>
                    <div style={{ height:10, background:'var(--border)', borderRadius:5, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:5, transition:'width .5s ease' }}/>
                    </div>
                    <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{c.enrolled_count||0}/{c.max_capacity} inscritos · {c.location||'—'}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Training requests summary */}
      {recentTrainings.length > 0 && (
        <>
          <div className="section-title">Treinos personalizados confirmados recentemente</div>
          <div className="card" style={{ padding:0, marginBottom:24 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Membro</th><th>Instrutor</th><th>Formato</th><th>Duração</th><th>Confirmado</th></tr></thead>
                <tbody>
                  {recentTrainings.map((t,i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:500 }}>{t.member?.full_name}</td>
                      <td style={{ color:'var(--t2)' }}>{t.instructor?.full_name}</td>
                      <td><span className="badge badge-purple">{t.format}</span></td>
                      <td style={{ color:'var(--t2)' }}>{t.duration_min}min</td>
                      <td style={{ color:'var(--t3)', fontSize:12 }}>{new Date(t.created_at).toLocaleDateString('pt-PT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detailed class table */}
      <div className="section-title">Detalhe de aulas</div>
      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Aula</th><th>Modalidade</th><th>Local</th><th>Inscritos</th><th>Capacidade</th><th>Ocupação</th></tr></thead>
            <tbody>
              {topClasses.map((c,i) => {
                const pct = c.max_capacity ? Math.round((c.enrolled_count||0)/c.max_capacity*100) : 0
                return (
                  <tr key={i}>
                    <td style={{ color:'var(--t3)', fontWeight:600 }}>#{i+1}</td>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td><span className="badge badge-gray">{c.type}</span></td>
                    <td style={{ color:'var(--t2)' }}>{c.location||'—'}</td>
                    <td style={{ fontWeight:600 }}>{c.enrolled_count||0}</td>
                    <td style={{ color:'var(--t2)' }}>{c.max_capacity}</td>
                    <td><span style={{ fontSize:13, fontWeight:700, color:pct>=90?'var(--red)':pct>=60?'var(--amber)':'var(--green)' }}>{pct}%</span></td>
                  </tr>
                )
              })}
              {topClasses.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'var(--t2)',padding:24}}>Sem dados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
