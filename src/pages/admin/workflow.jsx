import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'


function ConfirmModal({ title, message, onConfirm, onCancel, withNotes=false, notesLabel='Motivo (opcional)' }) {
  const [notes, setNotes] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div className="card" style={{ width:460, padding:28, boxShadow:'0 20px 60px rgba(15,23,42,0.2)' }}>
        <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>{title}</h3>
        <p style={{ color:'var(--t2)', fontSize:14, marginBottom:20 }}>{message}</p>
        {withNotes && (
          <div className="form-group">
            <label className="form-label">{notesLabel}</label>
            <textarea className="form-input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Escreve aqui..." style={{ resize:'none' }} />
          </div>
        )}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onConfirm(notes)}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}


export function AdminPedidosPendentes() {
  const [requests, setRequests] = useState([])
  const [studios, setStudios] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('aguarda_admin')
  const [modal, setModal] = useState(null) // { type, requestId, studioId? }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: reqs }, { data: sts }] = await Promise.all([
      supabase.from('personal_training_requests')
        .select('*, member:profiles!member_id(full_name,email,phone), instructor:profiles!instructor_id(full_name), studio:studios(name)')
        .order('created_at', { ascending:false }),
      supabase.from('studios').select('*').eq('active',true),
    ])
    setRequests(reqs || [])
    setStudios(sts || [])
    setLoading(false)
  }

  async function validate(id, approve, studioId=null, notes='') {
    const { error } = await supabase.from('personal_training_requests').update({
      status_admin: approve?'validated':'rejected',
      admin_response_at: new Date().toISOString(),
      admin_notes: notes||null,
      studio_id: studioId||null,
    }).eq('id', id)
    if (error) { setMsg('Erro: '+error.message); return }
    setMsg(approve?'Pedido validado! Estúdio atribuído com sucesso.':'Pedido rejeitado.')
    setModal(null)
    loadData()
    setTimeout(() => setMsg(''), 4000)
  }

  async function resolveConflict(id) {
    const { data:{user} } = await supabase.auth.getUser()
    await supabase.from('personal_training_requests').update({ conflict_resolved_by:user.id }).eq('id', id)
    setMsg('Conflito resolvido.')
    loadData()
    setTimeout(() => setMsg(''), 3000)
  }

  const awaiting   = requests.filter(r => r.overall_status==='aguarda_admin')
  const conflicts  = requests.filter(r => r.overall_status==='confirmado' && r.confirmed_instructor!==null && r.confirmed_member!==null && r.confirmed_instructor!==r.confirmed_member)
  const confirmed  = requests.filter(r => r.overall_status==='confirmado')
  const rejected   = requests.filter(r => r.overall_status.includes('rejeitado'))

  const tabData = { aguarda_admin:awaiting, conflitos:conflicts, confirmados:confirmed, rejeitados:rejected, todos:requests }
  const current = tabData[tab] || []

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Pedidos de treino pendentes</h1>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>Valida pedidos aceites pelo instrutor e atribui estúdio</p>

      {/* Modal de confirmação */}
      {modal?.type === 'validate' && (
        <ConfirmModal
          title="Validar e atribuir estúdio"
          message={`Confirmas a validação deste pedido com o estúdio "${studios.find(s=>s.id===modal.studioId)?.name}"?`}
          withNotes notesLabel="Nota para o membro e instrutor (opcional)"
          onConfirm={notes => validate(modal.requestId, true, modal.studioId, notes)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === 'reject' && (
        <ConfirmModal
          title="Rejeitar pedido"
          message="Tens a certeza que queres rejeitar este pedido?"
          withNotes notesLabel="Motivo da rejeição (recomendado)"
          onConfirm={notes => validate(modal.requestId, false, null, notes)}
          onCancel={() => setModal(null)}
        />
      )}

      {awaiting.length > 0 && (
        <div className="alert alert-warning mb-4" style={{ justifyContent:'space-between' }}>
          <span>⚠️ <strong>{awaiting.length}</strong> pedido(s) aceites pelos instrutores aguardam atribuição de estúdio.</span>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="alert alert-error mb-4">
          ⚡ <strong>{conflicts.length}</strong> conflito(s) — instrutor e membro discordam. Necessita arbitragem.
        </div>
      )}
      {msg && <div className={`alert ${msg.includes('Erro')?'alert-error':'alert-success'} mb-4`}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {[['aguarda_admin',`Aguardam (${awaiting.length})`],['conflitos',`Conflitos (${conflicts.length})`],['confirmados',`Confirmados (${confirmed.length})`],['rejeitados',`Rejeitados (${rejected.length})`],['todos',`Todos (${requests.length})`]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{ padding:'8px 14px', border:'none', cursor:'pointer', fontWeight:tab===key?600:400, color:tab===key?'var(--primary)':'var(--t2)', borderBottom:tab===key?'2px solid var(--primary)':'2px solid transparent', background:'transparent', fontSize:13 }}>{label}</button>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="empty-state"><div className="empty-state-title">Sem pedidos nesta categoria</div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {current.map(r => {
            const isConflict = r.confirmed_instructor!==null && r.confirmed_member!==null && r.confirmed_instructor!==r.confirmed_member
            const borderColor = r.overall_status==='aguarda_admin'?'var(--amber)':r.overall_status==='confirmado'?'var(--green)':'var(--red)'
            return (
              <div key={r.id} className="card" style={{ borderLeft:`4px solid ${borderColor}` }}>
                <div className="flex-between mb-4">
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{r.member?.full_name} → {r.instructor?.full_name}</div>
                    <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>
                      Treino {r.format} · {new Date(r.requested_at).toLocaleString('pt-PT',{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · {r.duration_min}min
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                    <span className={`badge ${r.overall_status==='aguarda_admin'?'badge-amber':r.overall_status==='confirmado'?'badge-green':'badge-red'}`}>
                      {r.overall_status==='aguarda_admin'?'Aceite — aguarda validação':r.overall_status==='confirmado'?'Confirmado':r.overall_status.replace('_',' ')}
                    </span>
                    {r.studio?.name && <span className="badge badge-blue">{r.studio.name}</span>}
                  </div>
                </div>

                {/* Estado do workflow */}
                <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                  {[['1. Pedido submetido','done'],['2. Instrutor aceitou',r.status_instructor==='accepted'?'done':r.status_instructor==='rejected'?'rejected':'pending'],['3. Academia validou',r.status_admin==='validated'?'done':r.status_admin==='rejected'?'rejected':'pending']].map(([label,state],i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:state==='done'?'var(--green-light)':state==='rejected'?'var(--red-light)':'var(--amber-light)', color:state==='done'?'var(--green-dark)':state==='rejected'?'var(--red-dark)':'var(--amber-dark)' }}>
                        {state==='done'?'✓ ':state==='rejected'?'✗ ':''}{label}
                      </div>
                      {i<2&&<div style={{ width:16, height:1, background:'var(--border)' }}/>}
                    </div>
                  ))}
                </div>

                {r.objective && <div style={{ fontSize:13, padding:'8px 12px', background:'var(--bg)', borderRadius:8, marginBottom:12, color:'var(--t2)' }}>Objetivo: "{r.objective}"</div>}
                {r.instructor_notes && <div style={{ fontSize:12, color:'var(--green-dark)', marginBottom:8 }}>Nota do instrutor: "{r.instructor_notes}"</div>}

                {/* Ação de validação — passo 3 */}
                {r.overall_status === 'aguarda_admin' && (
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', padding:'12px', background:'var(--bg)', borderRadius:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>Atribuir estúdio:</span>
                    <select style={{ padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', fontSize:13, background:'white', flex:1 }}
                      defaultValue=""
                      onChange={e => { if(e.target.value) setModal({ type:'validate', requestId:r.id, studioId:e.target.value }) }}>
                      <option value="" disabled>Selecionar estúdio...</option>
                      {studios.map(s=><option key={s.id} value={s.id}>{s.name} (cap. {s.capacity})</option>)}
                    </select>
                    <button className="btn btn-sm btn-danger" onClick={()=>setModal({type:'reject',requestId:r.id})}>Rejeitar</button>
                  </div>
                )}

                {/* Confirmação bilateral pós-sessão */}
                {r.overall_status === 'confirmado' && (
                  <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', padding:'10px 12px', background:'var(--bg)', borderRadius:8 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--t2)' }}>Confirmação pós-sessão:</span>
                    <span className={`badge ${r.confirmed_instructor?'badge-green':'badge-amber'}`}>Instrutor: {r.confirmed_instructor?'confirmou ✓':'pendente'}</span>
                    <span className={`badge ${r.confirmed_member?'badge-green':'badge-amber'}`}>Membro: {r.confirmed_member?'confirmou ✓':'pendente'}</span>
                    {isConflict && (
                      <div style={{ width:'100%', display:'flex', gap:8, marginTop:6 }}>
                        <span className="badge badge-red">⚡ Conflito — discordam sobre a realização</span>
                        <button className="btn btn-sm btn-primary" onClick={()=>resolveConflict(r.id)}>Marcar como resolvido</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


export function AdminEstudios() {
  const [studios, setStudios] = useState([])
  const [form, setForm] = useState({ name:'', capacity:20, type:'Geral' })
  const [errors, setErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('studios').select('*').order('name')
    setStudios(data || [])
    setLoading(false)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (form.capacity < 1) e.capacity = 'Mínimo 1'
    return e
  }

  async function addStudio(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const { data, error } = await supabase.from('studios').insert(form).select().single()
    if (error) { setMsg('Erro: '+error.message); return }
    setStudios(prev => [...prev, data])
    setMsg('Estúdio adicionado!')
    setShowForm(false)
    setForm({ name:'', capacity:20, type:'Geral' })
    setErrors({})
    setTimeout(() => setMsg(''), 3000)
  }

  async function toggleActive(studio) {
    await supabase.from('studios').update({ active:!studio.active }).eq('id',studio.id)
    setStudios(prev => prev.map(s => s.id===studio.id?{...s,active:!s.active}:s))
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Estúdios</h1>
          <p style={{ color:'var(--t2)' }}>Gere os espaços disponíveis para atribuição de treinos</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setShowForm(!showForm);setErrors({})}}>+ Novo estúdio</button>
      </div>

      {msg && <div className={`alert ${msg.includes('Erro')?'alert-error':'alert-success'} mb-4`}>{msg}</div>}

      {showForm && (
        <div className="card mb-6">
          <div className="card-title">Adicionar estúdio</div>
          <form onSubmit={addStudio}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="ex: Studio A" />
                {errors.name && <div style={{color:'var(--red)',fontSize:11,marginTop:3}}>{errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
                  {['Geral','Yoga/Pilates','Spinning','CrossFit','Natação','Musculação','Funcional'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ maxWidth:200 }}>
              <label className="form-label">Capacidade *</label>
              <input className="form-input" type="number" min={1} value={form.capacity} onChange={e=>set('capacity',parseInt(e.target.value)||1)} />
              {errors.capacity && <div style={{color:'var(--red)',fontSize:11,marginTop:3}}>{errors.capacity}</div>}
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-primary" type="submit">Guardar</button>
              <button className="btn btn-secondary" type="button" onClick={()=>{setShowForm(false);setErrors({})}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid-2">
        {studios.map(s => (
          <div key={s.id} className="card" style={{ borderLeft:`4px solid ${s.active?'var(--green)':'var(--border)'}`, opacity:s.active?1:.6 }}>
            <div className="flex-between mb-4">
              <div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>{s.name}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{s.type}</div>
                <div style={{ fontSize:12, color:'var(--t3)' }}>Capacidade: {s.capacity} pessoas</div>
              </div>
              <span className={`badge ${s.active?'badge-green':'badge-red'}`}>{s.active?'Ativo':'Inativo'}</span>
            </div>
            <button className={`btn btn-sm ${s.active?'btn-danger':'btn-success'}`} onClick={()=>toggleActive(s)}>
              {s.active?'Desativar':'Ativar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminPedidosPendentes


export function AdminOcupacaoEstudios() {
  const [studios, setStudios] = useState([])
  const [trainings, setTrainings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: sts }, { data: ptr }] = await Promise.all([
      supabase.from('studios').select('*').eq('active', true).order('name'),
      supabase.from('personal_training_requests')
        .select('*, member:profiles!member_id(full_name), instructor:profiles!instructor_id(full_name)')
        .eq('overall_status', 'confirmado')
        .not('studio_id', 'is', null)
        .gte('requested_at', new Date().toISOString())
        .order('requested_at').limit(30),
    ])
    setStudios(sts || [])
    setTrainings(ptr || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Estúdios — Ocupação</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 24 }}>Estado atual e próximas reservas por estúdio</p>

      <div className="grid-3 mb-6">
        {studios.map(s => {
          const stTrainings = trainings.filter(t => t.studio_id === s.id)
          const next = stTrainings[0]
          const isOccupied = next && new Date(next.requested_at) < new Date(Date.now() + 60 * 60 * 1000)
          return (
            <div key={s.id} className="card" style={{ borderTop: `4px solid ${isOccupied ? 'var(--amber)' : 'var(--green)'}` }}>
              <div className="flex-between mb-3">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>{s.type} · Cap. {s.capacity}</div>
                </div>
                <span className={`badge ${isOccupied ? 'badge-amber' : 'badge-green'}`}>
                  {isOccupied ? 'Em uso' : 'Disponível'}
                </span>
              </div>
              {stTrainings.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--t3)', padding: '8px 0' }}>Sem treinos agendados</div>
                : <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{stTrainings.length} treino(s) agendado(s)</div>
                    {stTrainings.slice(0, 2).map(t => (
                      <div key={t.id} style={{ padding: '4px 8px', background: 'var(--bg)', borderRadius: 6, marginBottom: 4 }}>
                        {new Date(t.requested_at).toLocaleString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{t.instructor?.full_name}
                      </div>
                    ))}
                  </div>
              }
            </div>
          )
        })}
      </div>

      {trainings.length > 0 && (
        <>
          <div className="section-title">Próximas reservas de estúdio</div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Estúdio</th><th>Data/Hora</th><th>Instrutor</th><th>Membro</th><th>Formato</th><th>Duração</th></tr></thead>
                <tbody>
                  {trainings.map(t => {
                    const studio = studios.find(s => s.id === t.studio_id)
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{studio?.name || '—'}</td>
                        <td style={{ color: 'var(--t2)' }}>{new Date(t.requested_at).toLocaleString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{t.instructor?.full_name}</td>
                        <td style={{ color: 'var(--t2)' }}>{t.member?.full_name}</td>
                        <td><span className="badge badge-gray">{t.format}</span></td>
                        <td style={{ color: 'var(--t2)' }}>{t.duration_min}min</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
