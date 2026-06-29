import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, UtensilsCrossed, Trash2, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
const MEAL_ICONS: Record<string,string> = { BREAKFAST:'🌅', LUNCH:'☀️', SNACKS:'🍎', DINNER:'🌙' };
const DEFAULT_TIMES: Record<string,{start:string;end:string}> = {
  BREAKFAST:{start:'07:30',end:'09:00'}, LUNCH:{start:'12:00',end:'14:00'},
  SNACKS:{start:'16:30',end:'17:30'}, DINNER:{start:'19:30',end:'21:00'},
};
const CATEGORIES = ['BREAKFAST','LUNCH','SNACKS','DINNER','ALL'];

export default function CommitteeMenuPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'schedule'|'items'>('schedule');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay()); // 0=Sun

  const [itemForm, setItemForm] = useState({ name:'', description:'', category:'BREAKFAST', isVeg:true, calories:'' });
  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: new Date().getDay(), mealType:'BREAKFAST', startTime:'07:30', endTime:'09:00',
    menuId:'default-menu-id', itemIds:[] as string[],
  });

  const { data: menusData } = useQuery({ queryKey:['menus'], queryFn:()=>api.get('/menu').then(r=>r.data) });
  const { data: itemsData } = useQuery({ queryKey:['meal-items'], queryFn:()=>api.get('/menu/items').then(r=>r.data) });

  const createItemMutation = useMutation({
    mutationFn:(body:any)=>api.post('/menu/items',body),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['meal-items']}); setShowAddItem(false); setItemForm({name:'',description:'',category:'BREAKFAST',isVeg:true,calories:''}); toast.success('Meal item added!'); },
    onError:(e:any)=>toast.error(e.response?.data?.message||'Failed to add item'),
  });

  const createScheduleMutation = useMutation({
    mutationFn:(body:any)=>api.post('/menu/schedules',body),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['active-menu']}); setShowAddSchedule(false); toast.success('Schedule created!'); },
    onError:(e:any)=>toast.error(e.response?.data?.message||'Failed: '+JSON.stringify(e.response?.data)),
  });

  const deleteMenuMutation = useMutation({
    mutationFn:(id:string)=>api.delete(`/menu/${id}`),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['menus']}); toast.success('Deleted'); },
    onError:(e:any)=>toast.error(e.response?.data?.message||'Failed'),
  });

  const items: any[] = itemsData?.data || [];
  const menus: any[] = menusData?.data || [];
  const itemsByCategory=(cat:string)=>items.filter((i:any)=>i.category===cat);

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div><h1 className="page-title">Menu Management</h1><p className="page-subtitle">Create and manage weekly meal schedules</p></div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" onClick={()=>setShowAddSchedule(true)}><Calendar size={15}/> Add Schedule</button>
            <button className="btn btn-primary" onClick={()=>setShowAddItem(true)}><Plus size={15}/> Add Meal Item</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:24,borderBottom:'1px solid var(--color-border)'}}>
          {(['schedule','items'] as const).map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:'10px 20px',background:'none',border:'none',borderBottom:activeTab===tab?'2px solid var(--color-primary)':'2px solid transparent',color:activeTab===tab?'var(--color-primary-light)':'var(--color-text-muted)',fontWeight:activeTab===tab?600:400,cursor:'pointer',fontSize:14,marginBottom:-1,transition:'all 0.15s'}}>
              {tab==='schedule'?'📅 Weekly Schedule':'🍽️ Meal Items'}
            </button>
          ))}
        </div>

        {/* Schedule Tab */}
        {activeTab==='schedule'&&(
          <div>
            <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
              {DAYS.map((day,i)=>(
                <button key={day} onClick={()=>setSelectedDay(i)} style={{padding:'8px 14px',borderRadius:10,border:'1px solid',borderColor:selectedDay===i?'var(--color-primary)':'var(--color-border)',background:selectedDay===i?'rgba(99,102,241,0.12)':'transparent',color:selectedDay===i?'var(--color-primary-light)':'var(--color-text-secondary)',fontWeight:selectedDay===i?600:400,cursor:'pointer',fontSize:13,transition:'all 0.15s'}}>
                  {day.slice(0,3)}
                </button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16}}>
              {MEAL_TYPES.map(meal=>{
                const mealItems=itemsByCategory(meal).slice(0,4);
                const t=DEFAULT_TIMES[meal];
                return (
                  <div key={meal} className="card" style={{padding:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <span style={{fontSize:20}}>{MEAL_ICONS[meal]}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{meal.charAt(0)+meal.slice(1).toLowerCase()}</div>
                        <div style={{fontSize:11,color:'var(--color-text-muted)',display:'flex',alignItems:'center',gap:4}}><Clock size={10}/>{t.start} – {t.end}</div>
                      </div>
                    </div>
                    {mealItems.length>0?(
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {mealItems.map((item:any)=>(
                          <div key={item.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}>
                            <span style={{fontSize:10}}>{item.isVeg?'🟢':'🔴'}</span>
                            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</span>
                          </div>
                        ))}
                        {itemsByCategory(meal).length>4&&<div style={{fontSize:11,color:'var(--color-text-muted)'}}>+{itemsByCategory(meal).length-4} more</div>}
                      </div>
                    ):(
                      <div style={{fontSize:12,color:'var(--color-text-muted)',fontStyle:'italic'}}>No items for this meal</div>
                    )}
                    <button className="btn btn-secondary" style={{width:'100%',marginTop:14,fontSize:12,padding:'6px 10px'}}
                      onClick={()=>{ setScheduleForm({...scheduleForm,dayOfWeek:selectedDay,mealType:meal,startTime:t.start,endTime:t.end,itemIds:[]}); setShowAddSchedule(true); }}>
                      <Plus size={12}/> Schedule Slot
                    </button>
                  </div>
                );
              })}
            </div>

            {menus.length>0&&(
              <div style={{marginTop:32}}>
                <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Menu Plans</h3>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {menus.map((menu:any)=>(
                    <div key={menu.id} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{menu.name}</div>
                        <div style={{fontSize:12,color:'var(--color-text-muted)'}}>{menu.description}</div>
                      </div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span className={`badge ${menu.isActive?'badge-success':'badge-muted'}`}>{menu.isActive?'Active':'Inactive'}</span>
                        <button className="btn btn-ghost btn-icon" style={{color:'var(--color-danger)'}} onClick={()=>{if(confirm('Delete?'))deleteMenuMutation.mutate(menu.id);}}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items Tab */}
        {activeTab==='items'&&(
          <div>
            {CATEGORIES.filter(c=>c!=='ALL').map(cat=>{
              const catItems=itemsByCategory(cat);
              return (
                <div key={cat} style={{marginBottom:28}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                    <span style={{fontSize:18}}>{MEAL_ICONS[cat]||'🍽️'}</span>
                    <h3 style={{fontSize:15,fontWeight:700}}>{cat.charAt(0)+cat.slice(1).toLowerCase()}</h3>
                    <span className="badge badge-muted">{catItems.length} items</span>
                  </div>
                  {catItems.length>0?(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                      {catItems.map((item:any)=>(
                        <div key={item.id} className="card" style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
                          <span>{item.isVeg?'🟢':'🔴'}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                            {item.calories&&<div style={{fontSize:11,color:'var(--color-text-muted)'}}>{item.calories} kcal</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ):(
                    <div style={{color:'var(--color-text-muted)',fontSize:13,fontStyle:'italic'}}>
                      No {cat.toLowerCase()} items yet.{' '}
                      <button style={{background:'none',border:'none',color:'var(--color-primary-light)',cursor:'pointer',fontSize:13}} onClick={()=>{setItemForm({...itemForm,category:cat});setShowAddItem(true);}}>Add one →</button>
                    </div>
                  )}
                </div>
              );
            })}
            {items.length===0&&(
              <div className="card">
                <div className="empty-state" style={{padding:80}}>
                  <div className="empty-state-icon"><UtensilsCrossed size={32}/></div>
                  <h3>No meal items yet</h3>
                  <p>Click "Add Meal Item" to get started</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Meal Item Modal */}
      {showAddItem&&(
        <div className="modal-overlay" onClick={()=>setShowAddItem(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 style={{fontSize:18,fontWeight:700}}>Add Meal Item</h2><button className="btn btn-ghost btn-icon" onClick={()=>setShowAddItem(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="form-group"><label className="form-label">Item Name *</label><input className="form-input" value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})} placeholder="e.g., Idli Sambar"/></div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={itemForm.description} onChange={e=>setItemForm({...itemForm,description:e.target.value})} placeholder="Short description"/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label className="form-label">Category (Meal)</label>
                    <select className="form-input form-select" value={itemForm.category} onChange={e=>setItemForm({...itemForm,category:e.target.value})}>
                      {MEAL_TYPES.map(m=><option key={m} value={m}>{MEAL_ICONS[m]} {m}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Calories (optional)</label><input type="number" className="form-input" value={itemForm.calories} onChange={e=>setItemForm({...itemForm,calories:e.target.value})} placeholder="kcal"/></div>
                </div>
                <div className="form-group"><label className="form-label">Type</label>
                  <div style={{display:'flex',gap:12}}>
                    {[true,false].map(veg=>(
                      <button key={String(veg)} type="button" onClick={()=>setItemForm({...itemForm,isVeg:veg})} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid',borderColor:itemForm.isVeg===veg?(veg?'#10b981':'#ef4444'):'var(--color-border)',background:itemForm.isVeg===veg?(veg?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'):'transparent',cursor:'pointer',fontSize:13,color:itemForm.isVeg===veg?(veg?'#10b981':'#ef4444'):'var(--color-text-muted)',fontWeight:itemForm.isVeg===veg?600:400}}>
                        {veg?'🟢 Vegetarian':'🔴 Non-Veg'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowAddItem(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={createItemMutation.isPending||!itemForm.name}
                onClick={()=>createItemMutation.mutate({name:itemForm.name,description:itemForm.description||undefined,category:itemForm.category,isVeg:itemForm.isVeg,...(itemForm.calories?{calories:Number(itemForm.calories)}:{})})}>
                {createItemMutation.isPending?'Adding...':'Add Meal Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddSchedule&&(
        <div className="modal-overlay" onClick={()=>setShowAddSchedule(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 style={{fontSize:18,fontWeight:700}}>Add Schedule Slot</h2><button className="btn btn-ghost btn-icon" onClick={()=>setShowAddSchedule(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{padding:12,background:'rgba(99,102,241,0.08)',borderRadius:10,fontSize:13,color:'var(--color-text-muted)'}}>
                  💡 Schedule slots define <strong>when</strong> each meal is served. Select the meal items to include — committee members use these schedules to mark attendance for each meal.
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label className="form-label">Day of Week</label>
                    <select className="form-input form-select" value={scheduleForm.dayOfWeek} onChange={e=>setScheduleForm({...scheduleForm,dayOfWeek:Number(e.target.value)})}>
                      {DAYS.map((d,i)=><option key={d} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Meal Type</label>
                    <select className="form-input form-select" value={scheduleForm.mealType} onChange={e=>{const t=DEFAULT_TIMES[e.target.value];setScheduleForm({...scheduleForm,mealType:e.target.value,startTime:t.start,endTime:t.end});}}>
                      {MEAL_TYPES.map(m=><option key={m} value={m}>{MEAL_ICONS[m]} {m}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Start Time</label><input type="time" className="form-input" value={scheduleForm.startTime} onChange={e=>setScheduleForm({...scheduleForm,startTime:e.target.value})}/></div>
                  <div className="form-group"><label className="form-label">End Time</label><input type="time" className="form-input" value={scheduleForm.endTime} onChange={e=>setScheduleForm({...scheduleForm,endTime:e.target.value})}/></div>
                </div>
                <div className="form-group"><label className="form-label">Select Meal Items * (select items to include)</label>
                  <div style={{maxHeight:160,overflowY:'auto',display:'flex',flexDirection:'column',gap:6,marginTop:6}}>
                    {items.map((item:any)=>(
                      <label key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,cursor:'pointer',border:'1px solid',borderColor:scheduleForm.itemIds.includes(item.id)?'var(--color-primary)':'var(--color-border)',background:scheduleForm.itemIds.includes(item.id)?'rgba(99,102,241,0.08)':'transparent'}}>
                        <input type="checkbox" checked={scheduleForm.itemIds.includes(item.id)} onChange={e=>{setScheduleForm({...scheduleForm,itemIds:e.target.checked?[...scheduleForm.itemIds,item.id]:scheduleForm.itemIds.filter(id=>id!==item.id)});}} style={{accentColor:'var(--color-primary)'}}/>
                        <span style={{fontSize:10}}>{item.isVeg?'🟢':'🔴'}</span>
                        <span style={{fontSize:13}}>{item.name}</span>
                        <span className="badge badge-muted" style={{marginLeft:'auto',fontSize:10}}>{item.category}</span>
                      </label>
                    ))}
                    {items.length===0&&<div style={{fontSize:13,color:'var(--color-text-muted)',padding:'8px 0'}}>No meal items yet — add items first.</div>}
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Menu Plan</label>
                  <select className="form-input form-select" value={scheduleForm.menuId} onChange={e=>setScheduleForm({...scheduleForm,menuId:e.target.value})}>
                    <option value="default-menu-id">Weekly Standard Menu (Default)</option>
                    {menus.filter((m:any)=>m.id!=='default-menu-id').map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowAddSchedule(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={createScheduleMutation.isPending||scheduleForm.itemIds.length===0}
                onClick={()=>createScheduleMutation.mutate(scheduleForm)}>
                {createScheduleMutation.isPending?'Creating...':'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
