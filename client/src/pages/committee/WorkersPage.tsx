import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Briefcase, Phone, Mail, DollarSign, Trash2, Edit3, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const SHIFTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const SHIFT_COLORS: Record<string,{bg:string;color:string;icon:string}> = {
  MORNING:   { bg:'rgba(251,191,36,0.12)', color:'#f59e0b', icon:'🌅' },
  AFTERNOON: { bg:'rgba(249,115,22,0.12)', color:'#f97316', icon:'☀️' },
  EVENING:   { bg:'rgba(139,92,246,0.12)', color:'#8b5cf6', icon:'🌆' },
  NIGHT:     { bg:'rgba(59,130,246,0.12)', color:'#3b82f6', icon:'🌙' },
};

const emptyForm = { name:'', phone:'', email:'', designation:'', shift:'MORNING', salary:0, joiningDate:'', notes:'' };

export default function WorkersPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterShift, setFilterShift] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workers', filterShift],
    queryFn: () => api.get(`/workers${filterShift?`?shift=${filterShift}`:''}`).then(r=>r.data),
  });
  const { data: stats } = useQuery({
    queryKey: ['worker-stats'],
    queryFn: () => api.get('/workers/stats').then(r=>r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (body: typeof form) =>
      editId ? api.put(`/workers/${editId}`, body) : api.post('/workers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      qc.invalidateQueries({ queryKey: ['worker-stats'] });
      setShowModal(false); setEditId(null); setForm(emptyForm);
      toast.success(editId ? 'Worker updated!' : 'Worker added!');
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id:string) => api.delete(`/workers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workers'] }); qc.invalidateQueries({ queryKey: ['worker-stats'] }); toast.success('Worker deactivated'); },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openEdit = (w: any) => { setForm({ name:w.name, phone:w.phone, email:w.email||'', designation:w.designation, shift:w.shift, salary:w.salary, joiningDate:w.joiningDate?.slice(0,10)||'', notes:w.notes||'' }); setEditId(w.id); setShowModal(true); };
  const workers: any[] = data?.data || [];

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div><h1 className="page-title">Mess Workers</h1><p className="page-subtitle">Staff directory, shifts and salary management</p></div>
          <button className="btn btn-primary" onClick={()=>{setForm(emptyForm);setEditId(null);setShowModal(true);}}>
            <Plus size={15}/> Add Worker
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{marginBottom:24}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>TOTAL STAFF</div>
            <div style={{fontSize:28,fontWeight:800}}>{stats?.total||0}</div>
          </div>
          <div className="card" style={{padding:20,borderColor:'rgba(239,68,68,0.3)'}}>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>MONTHLY SALARY COST</div>
            <div style={{fontSize:28,fontWeight:800,color:'#ef4444'}}>₹{(stats?.totalSalary||0).toLocaleString()}</div>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:4}}>Deducted from monthly budget</div>
          </div>
          {SHIFTS.map(s=>(
            <div key={s} className="card" style={{padding:20}}>
              <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>{SHIFT_COLORS[s].icon} {s}</div>
              <div style={{fontSize:22,fontWeight:800,color:SHIFT_COLORS[s].color}}>{stats?.byShift?.[s]||0} staff</div>
            </div>
          ))}
        </div>

        {/* Shift Filter */}
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {['','MORNING','AFTERNOON','EVENING','NIGHT'].map(s=>(
            <button key={s} onClick={()=>setFilterShift(s)} style={{padding:'7px 14px',borderRadius:20,border:'1px solid',borderColor:filterShift===s?'var(--color-primary)':'var(--color-border)',background:filterShift===s?'rgba(99,102,241,0.12)':'transparent',color:filterShift===s?'var(--color-primary-light)':'var(--color-text-secondary)',cursor:'pointer',fontSize:13,fontWeight:filterShift===s?600:400}}>
              {s?`${SHIFT_COLORS[s]?.icon} ${s}`:'All Shifts'}
            </button>
          ))}
        </div>

        {/* Workers Grid */}
        {isLoading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{height:180,borderRadius:14}}/>)}
          </div>
        ) : workers.length > 0 ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {workers.map((w:any)=>{
              const sh = SHIFT_COLORS[w.shift];
              return (
                <div key={w.id} className="card" style={{padding:22,opacity:w.isActive?1:0.55}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:44,height:44,borderRadius:12,background:sh.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{sh.icon}</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:15}}>{w.name}</div>
                        <div style={{fontSize:12,color:'var(--color-text-muted)'}}>{w.designation}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-icon" onClick={()=>openEdit(w)}><Edit3 size={13}/></button>
                      {user?.role==='ADMIN'&&<button className="btn btn-ghost btn-icon" style={{color:'var(--color-danger)'}} onClick={()=>{if(confirm(`Deactivate ${w.name}?`))deleteMutation.mutate(w.id);}}><Trash2 size={13}/></button>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
                      <Clock size={13} color="var(--color-text-muted)"/>
                      <span style={{padding:'2px 8px',borderRadius:6,background:sh.bg,color:sh.color,fontSize:11,fontWeight:600}}>{w.shift}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
                      <Phone size={13} color="var(--color-text-muted)"/>
                      <span>{w.phone}</span>
                    </div>
                    {w.email&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
                      <Mail size={13} color="var(--color-text-muted)"/>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.email}</span>
                    </div>}
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
                      <DollarSign size={13} color="var(--color-text-muted)"/>
                      <span style={{fontWeight:700,color:'#10b981'}}>₹{w.salary.toLocaleString()}<span style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:400}}>/month</span></span>
                    </div>
                    {!w.isActive&&<span className="badge badge-danger" style={{marginTop:4}}>Inactive</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card"><div className="empty-state" style={{padding:80}}>
            <div className="empty-state-icon"><Briefcase size={32}/></div>
            <h3>No workers yet</h3>
            <p>Add your first mess staff member above</p>
          </div></div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal&&(
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{fontSize:18,fontWeight:700}}>{editId?'Edit Worker':'Add Worker'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g., Ramesh Kumar"/></div>
                <div className="form-group"><label className="form-label">Phone *</label><input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="9876543210"/></div>
                <div className="form-group"><label className="form-label">Email (optional)</label><input className="form-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@example.com"/></div>
                <div className="form-group"><label className="form-label">Designation *</label><input className="form-input" value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} placeholder="e.g., Head Cook"/></div>
                <div className="form-group"><label className="form-label">Shift *</label>
                  <select className="form-input form-select" value={form.shift} onChange={e=>setForm({...form,shift:e.target.value})}>
                    {SHIFTS.map(s=><option key={s} value={s}>{SHIFT_COLORS[s].icon} {s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Monthly Salary (₹) *</label><input type="number" className="form-input" value={form.salary} onChange={e=>setForm({...form,salary:Number(e.target.value)})}/></div>
                <div className="form-group"><label className="form-label">Joining Date</label><input type="date" className="form-input" value={form.joiningDate} onChange={e=>setForm({...form,joiningDate:e.target.value})}/></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any additional info"/></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saveMutation.isPending||!form.name||!form.phone||!form.designation||!form.salary} onClick={()=>saveMutation.mutate(form)}>
                {saveMutation.isPending?'Saving...':(editId?'Update Worker':'Add Worker')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
