import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminEquipamentos() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name:'', category:'Cardio', quantity:1, condition:'Bom', location:'', notes:'' })
  const [errors, setErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('equipment').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (form.quantity < 1) e.quantity = 'Mínimo 1'
    return e
  }

  async function addItem(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const { data, error } = await supabase.from('equipment').insert(form).select().single()
    if (error) setMsg('Erro: ' + error.message)
    else {
      setItems(prev => [...prev, data])
      setMsg('Equipamento adicionado!')
      setShowForm(false)
      setForm({ name:'', category:'Cardio', quantity:1, condition:'Bom', location:'', notes:'' })
      setErrors({})
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteItem(id, name) {
    if (!window.confirm(`Apagar "${name}"? Esta ação não pode ser revertida.`)) return
    await supabase.from('equipment').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const conditionBadge = { Bom:'badge-green', Regular:'badge-amber', Mau:'badge-red', 'Em manutenção':'badge-amber' }
  const stats = { Bom: items.filter(i=>i.condition==='Bom').length, Regular: items.filter(i=>i.condition==='Regular').length, Mau: items.filter(i=>i.condition==='Mau'||i.condition==='Em manutenção').length }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Equipamentos</h1>
          <p style={{ color:'var(--t2)' }}>Inventário de equipamentos da academia</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setErrors({}) }}>+ Adicionar</button>
      </div>

      {/* Summary */}
      <div className="stats-grid mb-6">
        <div className="stat-card"><div className="stat-label">Total de itens</div><div className="stat-value">{items.length}</div></div>
        <div className="stat-card green"><div className="stat-label">Em bom estado</div><div className="stat-value">{stats.Bom}</div></div>
        <div className="stat-card amber"><div className="stat-label">Estado regular</div><div className="stat-value">{stats.Regular}</div></div>
        <div className="stat-card red"><div className="stat-label">Mau / manutenção</div><div className="stat-value">{stats.Mau}</div></div>
      </div>

      {msg && <div className={`alert ${msg.includes('Erro')?'alert-error':'alert-success'} mb-4`}>{msg}</div>}

      {showForm && (
        <div className="card mb-6">
          <div className="card-title">Novo equipamento</div>
          <form onSubmit={addItem}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={form.name} onChange={e => set('name',e.target.value)} placeholder="ex: Bicicleta ergométrica" />
                {errors.name && <div style={{color:'var(--red)',fontSize:11,marginTop:3}}>{errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={form.category} onChange={e => set('category',e.target.value)}>
                  {['Cardio','Musculação','Yoga','Pilates','Piscina','Funcional','Outros'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantidade *</label>
                <input className="form-input" type="number" min={1} value={form.quantity} onChange={e => set('quantity',parseInt(e.target.value)||1)} />
                {errors.quantity && <div style={{color:'var(--red)',fontSize:11,marginTop:3}}>{errors.quantity}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={form.condition} onChange={e => set('condition',e.target.value)}>
                  {['Bom','Regular','Mau','Em manutenção'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Localização</label><input className="form-input" value={form.location} onChange={e=>set('location',e.target.value)} placeholder="ex: Studio A" /></div>
              <div className="form-group"><label className="form-label">Notas</label><input className="form-input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Observações..." /></div>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-primary" type="submit">Guardar</button>
              <button className="btn btn-secondary" type="button" onClick={()=>{setShowForm(false);setErrors({})}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Categoria</th><th>Qtd.</th><th>Estado</th><th>Local</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight:500 }}>{i.name}</td>
                  <td><span className="badge badge-gray">{i.category}</span></td>
                  <td style={{ fontWeight:600 }}>{i.quantity}</td>
                  <td><span className={`badge ${conditionBadge[i.condition]||'badge-gray'}`}>{i.condition}</span></td>
                  <td style={{ color:'var(--t2)' }}>{i.location||'—'}</td>
                  <td style={{ color:'var(--t3)', fontSize:12 }}>{i.notes||'—'}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={()=>deleteItem(i.id,i.name)}>Apagar</button></td>
                </tr>
              ))}
              {items.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'var(--t2)',padding:24}}>Sem equipamentos registados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
