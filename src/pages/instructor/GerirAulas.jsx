import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function InstructorGerirAulas() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('classes').select('*')
      .eq('instructor_id', profile?.id).order('scheduled_at', { ascending: false })
    setClasses(data || [])
    setLoading(false)
  }

  function validateEdit() {
    const e = {}
    if (!editing?.name?.trim()) e.name = 'Nome obrigatório'
    if (!editing?.scheduled_at) e.scheduled_at = 'Data obrigatória'
    if ((editing?.max_capacity||0) < 1) e.max_capacity = 'Mínimo 1'
    return e
  }

  async function save() {
    const errs = validateEdit()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const { name, type, scheduled_at, duration_min, max_capacity, location } = editing
    const { error } = await supabase.from('classes').update({ name, type, scheduled_at, duration_min, max_capacity, location }).eq('id', editing.id)
    if (error) setMsg('Erro ao guardar.')
    else { setMsg('Aula atualizada!'); setClasses(prev => prev.map(c => c.id===editing.id?editing:c)); setEditing(null); setErrors({}) }
    setTimeout(() => setMsg(''), 3000)
  }

  async function cancelClass(id) {
    if (!window.confirm('Cancelar esta aula? Os inscritos serão notificados.')) return
    await supabase.from('classes').update({ status:'cancelled' }).eq('id', id)
    setClasses(prev => prev.map(c => c.id===id?{...c,status:'cancelled'}:c))
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Gerir aulas</h1>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>Edita ou cancela as tuas aulas agendadas</p>

      {msg && <div className={`alert ${msg.includes('Erro')?'alert-error':'alert-success'} mb-4`}>{msg}</div>}

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Aula</th><th>Tipo</th><th>Data/Hora</th><th>Vagas</th><th>Estado</th><th>Ações</th></tr></thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id} style={{ opacity: c.status==='cancelled'?.5:1 }}>
                  {editing?.id === c.id ? (
                    <>
                      <td>
                        <input className="form-input" value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} />
                        {errors.name&&<div style={{color:'var(--red)',fontSize:11}}>{errors.name}</div>}
                      </td>
                      <td>
                        <select className="form-select" value={editing.type} onChange={e=>setEditing(p=>({...p,type:e.target.value}))}>
                          {['Yoga','Spinning','Pilates','CrossFit','Natação','Dança','Musculação'].map(t=><option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td>
                        <input className="form-input" type="datetime-local" value={editing.scheduled_at?.slice(0,16)} onChange={e=>setEditing(p=>({...p,scheduled_at:e.target.value}))} />
                        {errors.scheduled_at&&<div style={{color:'var(--red)',fontSize:11}}>{errors.scheduled_at}</div>}
                      </td>
                      <td>
                        <input className="form-input" type="number" min={1} style={{width:70}} value={editing.max_capacity} onChange={e=>setEditing(p=>({...p,max_capacity:parseInt(e.target.value)||1}))} />
                        {errors.max_capacity&&<div style={{color:'var(--red)',fontSize:11}}>{errors.max_capacity}</div>}
                      </td>
                      <td><span className="badge badge-amber">A editar</span></td>
                      <td style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-sm btn-primary" onClick={save}>Guardar</button>
                        <button className="btn btn-sm btn-secondary" onClick={()=>{setEditing(null);setErrors({})}}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight:500 }}>{c.name}</td>
                      <td><span className="badge badge-gray">{c.type}</span></td>
                      <td style={{ color:'var(--t2)', fontSize:13 }}>
                        {new Date(c.scheduled_at).toLocaleString('pt-PT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </td>
                      <td>
                        <span style={{ fontSize:13 }}>{c.enrolled_count||0}</span>
                        <span style={{ color:'var(--t3)', fontSize:12 }}>/{c.max_capacity}</span>
                      </td>
                      <td>
                        <span className={`badge ${c.status==='confirmed'?'badge-green':c.status==='cancelled'?'badge-red':'badge-amber'}`}>{c.status}</span>
                      </td>
                      <td style={{ display:'flex', gap:6 }}>
                        {c.status!=='cancelled' && <>
                          <button className="btn btn-sm btn-secondary" onClick={()=>setEditing(c)}>Editar</button>
                          <button className="btn btn-sm btn-danger" onClick={()=>cancelClass(c.id)}>Cancelar</button>
                        </>}
                        {c.status==='cancelled' && <span style={{fontSize:12,color:'var(--t3)'}}>Cancelada</span>}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {classes.length===0&&<tr><td colSpan={6} style={{textAlign:'center',color:'var(--t2)',padding:24}}>Sem aulas. Cria a tua primeira aula.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
