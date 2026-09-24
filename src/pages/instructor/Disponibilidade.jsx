import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']

export default function InstructorDisponibilidade() {
  const { profile } = useAuth()
  const [slots, setSlots] = useState([])
  const [classes, setClasses] = useState([])
  const [trainings, setTrainings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ weekday: 1, start_time: '09:00', end_time: '10:00', is_recurring: true, specific_date: '', notes: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: avail }, { data: cls }, { data: ptr }] = await Promise.all([
      supabase.from('instructor_availability').select('*').eq('instructor_id', profile?.id).order('weekday').order('start_time'),
      supabase.from('classes').select('*').eq('instructor_id', profile?.id).eq('status', 'confirmed').gte('scheduled_at', new Date().toISOString()).order('scheduled_at'),
      supabase.from('personal_training_requests').select('*, member:profiles!member_id(full_name)').eq('instructor_id', profile?.id).eq('overall_status', 'confirmado').order('requested_at'),
    ])
    setSlots(avail || [])
    setClasses(cls || [])
    setTrainings(ptr || [])
    setLoading(false)
  }

  async function addSlot(e) {
    e.preventDefault()
    const payload = {
      instructor_id: profile?.id,
      weekday: form.is_recurring ? form.weekday : new Date(form.specific_date + 'T00:00:00').getDay() || 7,
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      is_recurring: form.is_recurring,
      specific_date: form.is_recurring ? null : form.specific_date || null,
      notes: form.notes || null,
    }
    const { error } = await supabase.from('instructor_availability').insert(payload)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Disponibilidade adicionada!')
    setShowForm(false)
    setForm({ weekday: 1, start_time: '09:00', end_time: '10:00', is_recurring: true, specific_date: '', notes: '' })
    loadData()
    setTimeout(() => setMsg(''), 3000)
  }

  async function removeSlot(id) {
    if (!window.confirm('Remover este slot de disponibilidade?')) return
    await supabase.from('instructor_availability').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  function getEventAt(dayIndex, hour) {
    const weekday = dayIndex + 1
    const h = parseInt(hour.split(':')[0])
    const training = trainings.find(t => {
      const d = new Date(t.requested_at)
      const dow = d.getDay() === 0 ? 7 : d.getDay()
      const startH = d.getHours()
      const endH = startH + Math.ceil((t.duration_min || 60) / 60)
      return dow === weekday && h >= startH && h < endH
    })
    if (training) return { type: 'training', data: training }
    const cls = classes.find(c => {
      const d = new Date(c.scheduled_at)
      const dow = d.getDay() === 0 ? 7 : d.getDay()
      const startH = d.getHours()
      const endH = startH + Math.ceil((c.duration_min || 60) / 60)
      return dow === weekday && h >= startH && h < endH
    })
    if (cls) return { type: 'class', data: cls }
    const avail = slots.find(s => {
      if (s.weekday !== weekday) return false
      const startH = parseInt(s.start_time?.split(':')[0] || 0)
      const endH = parseInt(s.end_time?.split(':')[0] || 0)
      return h >= startH && h < endH
    })
    if (avail) return { type: 'available', data: avail }
    return null
  }

  function isFirstHour(dayIndex, hour, event) {
    if (!event) return false
    const h = parseInt(hour.split(':')[0])
    if (event.type === 'available') return parseInt(event.data.start_time?.split(':')[0]) === h
    if (event.type === 'training') return new Date(event.data.requested_at).getHours() === h
    if (event.type === 'class') return new Date(event.data.scheduled_at).getHours() === h
    return false
  }

  const eventStyle = {
    available: { bg: '#10B981', label: 'rgba(255,255,255,0.85)' },
    training:  { bg: '#6366F1', label: 'rgba(255,255,255,0.9)' },
    class:     { bg: '#3B82F6', label: 'rgba(255,255,255,0.9)' },
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>A carregar...</div>

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Disponibilidade & Agenda</h1>
          <p style={{ color: 'var(--t2)' }}>Visão completa da tua semana</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Adicionar disponibilidade</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['#10B981','Disponível para treino'], ['#6366F1','Treino personalizado confirmado'], ['#3B82F6','Aula de grupo']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />
            <span style={{ color: 'var(--t2)' }}>{label}</span>
          </div>
        ))}
      </div>

      {msg && <div className={`alert ${msg.includes('Erro') ? 'alert-error' : 'alert-success'} mb-4`}>{msg}</div>}

      {showForm && (
        <div className="card mb-6">
          <div className="card-title">Adicionar slot de disponibilidade</div>
          <form onSubmit={addSlot}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.is_recurring} onChange={e => set('is_recurring', e.target.value === 'true')}>
                  <option value="true">Recorrente (todas as semanas)</option>
                  <option value="false">Pontual (data específica)</option>
                </select>
              </div>
              {form.is_recurring
                ? <div className="form-group">
                    <label className="form-label">Dia da semana</label>
                    <select className="form-select" value={form.weekday} onChange={e => set('weekday', parseInt(e.target.value))}>
                      {DAYS.map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
                    </select>
                  </div>
                : <div className="form-group">
                    <label className="form-label">Data específica</label>
                    <input className="form-input" type="date" value={form.specific_date} onChange={e => set('specific_date', e.target.value)} required={!form.is_recurring} min={new Date().toISOString().split('T')[0]} />
                  </div>
              }
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hora início</label>
                <select className="form-select" value={form.start_time} onChange={e => set('start_time', e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hora fim</label>
                <select className="form-select" value={form.end_time} onChange={e => set('end_time', e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas (opcional)</label>
              <input className="form-input" placeholder="ex: Disponível para Yoga apenas" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" type="submit">Guardar</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Weekly grid */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', minWidth: 640 }}>
          <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
            <div style={{ height: 48, borderBottom: '1px solid var(--border)' }} />
            {HOURS.map(h => (
              <div key={h} style={{ height: 52, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 4, fontSize: 11, color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>{h}</div>
            ))}
          </div>
          {DAYS.map((day, di) => (
            <div key={di} style={{ flex: 1, borderRight: di < 5 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--t1)', background: 'var(--bg)' }}>
                {day}
              </div>
              {HOURS.map(h => {
                const event = getEventAt(di, h)
                const isFirst = event ? isFirstHour(di, h, event) : false
                const style = event ? eventStyle[event.type] : null
                return (
                  <div key={h} style={{ height: 52, borderBottom: '1px solid var(--border)', background: style ? style.bg + '18' : 'transparent', position: 'relative', overflow: 'hidden' }}>
                    {event && (
                      <div style={{ position: 'absolute', inset: '3px 4px', background: style.bg, borderRadius: 6, padding: '2px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                        {isFirst && (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'white', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {event.type === 'available' && (event.data.notes || 'Disponível')}
                              {event.type === 'training' && `Treino ${event.data.format}`}
                              {event.type === 'class' && event.data.name}
                            </div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {event.type === 'available' && `${event.data.start_time?.slice(0,5)}–${event.data.end_time?.slice(0,5)} · ${event.data.is_recurring ? 'Recorrente' : 'Pontual'}`}
                              {event.type === 'training' && event.data.member?.full_name}
                              {event.type === 'class' && `${new Date(event.data.scheduled_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})} · ${event.data.location || 'Studio'}`}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Slots list */}
      {slots.length > 0 && (
        <>
          <div className="section-title mt-6">Slots de disponibilidade ({slots.length})</div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Dia</th><th>Horário</th><th>Tipo</th><th>Data específica</th><th>Notas</th><th></th></tr></thead>
                <tbody>
                  {slots.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{DAYS[s.weekday - 1]}</td>
                      <td>{s.start_time?.slice(0,5)} — {s.end_time?.slice(0,5)}</td>
                      <td><span className={`badge ${s.is_recurring ? 'badge-green' : 'badge-blue'}`}>{s.is_recurring ? 'Recorrente' : 'Pontual'}</span></td>
                      <td style={{ color: 'var(--t2)', fontSize: 12 }}>{s.specific_date ? new Date(s.specific_date + 'T12:00:00').toLocaleDateString('pt-PT') : '—'}</td>
                      <td style={{ color: 'var(--t2)', fontSize: 12 }}>{s.notes || '—'}</td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => removeSlot(s.id)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {slots.length === 0 && !showForm && (
        <div className="card mt-6" style={{ textAlign: 'center', padding: 32, color: 'var(--t2)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>📆</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Sem disponibilidade registada</div>
          <p style={{ fontSize: 13 }}>Clica em "Adicionar disponibilidade" para os membros poderem pedir treinos personalizados contigo.</p>
        </div>
      )}
    </div>
  )
}
