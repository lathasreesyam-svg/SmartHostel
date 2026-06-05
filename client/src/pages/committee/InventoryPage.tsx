import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Package, AlertTriangle, Trash2, ShoppingCart, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'items'|'purchases'|'budget'>('items');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [itemForm, setItemForm] = useState({ name:'', unit:'kg', currentStock:0, minimumStock:0, maximumCapacity:0, pricePerUnit:0, category:'GRAINS', supplier:'' });
  const [purchaseForm, setPurchaseForm] = useState({ itemId:'', quantity:0, pricePerUnit:0, supplier:'' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey:['inventory'], queryFn:()=>api.get('/inventory?limit=100').then(r=>r.data) });
  const { data: stats } = useQuery({ queryKey:['inventory-stats'], queryFn:()=>api.get('/inventory/stats').then(r=>r.data.data) });

  const createItem = useMutation({
    mutationFn:(body:typeof itemForm)=>api.post('/inventory',body),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['inventory']}); qc.invalidateQueries({queryKey:['inventory-stats']}); setShowAddItem(false); setItemForm({name:'',unit:'kg',currentStock:0,minimumStock:0,maximumCapacity:0,pricePerUnit:0,category:'GRAINS',supplier:''}); toast.success('Item added!'); },
    onError:(e:any)=>toast.error(e.response?.data?.message||'Failed'),
  });

  const deleteItem = useMutation({
    mutationFn:(id:string)=>api.delete(`/inventory/${id}`),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['inventory']}); qc.invalidateQueries({queryKey:['inventory-stats']}); toast.success('Item deleted'); },
    onError:(e:any)=>toast.error(e.response?.data?.message||'Cannot delete'),
  });

  const recordPurchase = useMutation({
    mutationFn:(body:typeof purchaseForm)=>api.post('/inventory/purchases',body),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['inventory']}); qc.invalidateQueries({queryKey:['inventory-stats']}); setShowPurchase(false); setPurchaseForm({itemId:'',quantity:0,pricePerUnit:0,supplier:''}); toast.success('Purchase recorded — stock updated!'); },
    onError:(e:any)=>toast.error(e.response?.data?.message||'Failed'),
  });

  const items: any[] = data?.data || [];
  const isLow = (item:any)=>item.currentStock<=item.minimumStock;

  // Simulated monthly budget (real implementation would come from a purchases API)
  const currentYear = new Date().getFullYear();
  const monthlyBudget = 50000;
  const mockMonthlySpend = MONTHS.map((_,i)=>({
    month:MONTHS[i],
    spend: i < new Date().getMonth() ? Math.round(20000+Math.random()*25000) : i===new Date().getMonth() ? Math.round(stats?.totalValue||0) : 0,
  }));
  const yearlyTotal = mockMonthlySpend.reduce((s,m)=>s+m.spend,0);
  const currentMonthSpend = mockMonthlySpend[new Date().getMonth()].spend;
  const budgetUsed = Math.min((currentMonthSpend/monthlyBudget)*100,100);

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">Manage mess inventory and purchases</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" onClick={()=>setShowPurchase(true)} title="Record a purchase of an existing item — increases its stock level">
              <ShoppingCart size={15}/> Record Purchase
            </button>
            <button className="btn btn-primary" onClick={()=>setShowAddItem(true)} title="Add a brand new item to the inventory catalog">
              <Plus size={16}/> Add New Item
            </button>
          </div>
        </div>

        {/* Info banner explaining the two buttons */}
        <div style={{display:'flex',gap:12,marginBottom:20,padding:'10px 14px',background:'rgba(99,102,241,0.06)',borderRadius:10,border:'1px solid rgba(99,102,241,0.15)',fontSize:12,color:'var(--color-text-muted)'}}>
          <span>💡 <strong>Add New Item</strong> = adds a new product to your catalog (e.g., "Tomatoes"). &nbsp;|&nbsp; <strong>Record Purchase</strong> = logs a purchase of an existing item, automatically increasing its stock level.</span>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{marginBottom:24}}>
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>TOTAL ITEMS</div>
            <div style={{fontSize:26,fontWeight:800}}>{stats?.totalItems||0}</div>
          </div>
          <div className="card" style={{padding:18,borderColor:'rgba(245,158,11,0.3)'}}>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>LOW STOCK</div>
            <div style={{fontSize:26,fontWeight:800,color:'#f59e0b'}}>{stats?.lowStockCount||0}</div>
          </div>
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>TOTAL VALUE</div>
            <div style={{fontSize:26,fontWeight:800}}>₹{(stats?.totalValue||0).toLocaleString()}</div>
          </div>
          <div className="card" style={{padding:18,borderColor:'rgba(16,185,129,0.3)'}}>
            <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>MONTHLY BUDGET</div>
            <div style={{fontSize:26,fontWeight:800,color:'#10b981'}}>₹{monthlyBudget.toLocaleString()}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid var(--color-border)'}}>
          {(['items','purchases','budget'] as const).map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:'10px 18px',background:'none',border:'none',borderBottom:activeTab===tab?'2px solid var(--color-primary)':'2px solid transparent',color:activeTab===tab?'var(--color-primary-light)':'var(--color-text-muted)',fontWeight:activeTab===tab?600:400,cursor:'pointer',fontSize:13,marginBottom:-1,transition:'all 0.15s',textTransform:'capitalize'}}>
              {tab==='items'?'📦 Items':tab==='purchases'?'🛒 Purchase Log':'📊 Monthly Budget'}
            </button>
          ))}
        </div>

        {/* ── Items Tab ── */}
        {activeTab==='items' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table className="table">
              <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Price/Unit</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item:any)=>(
                  <tr key={item.id}>
                    <td style={{fontWeight:600}}>{item.name}</td>
                    <td><span className="badge badge-muted">{item.category}</span></td>
                    <td><span style={{color:isLow(item)?'#f59e0b':'inherit',fontWeight:isLow(item)?700:400}}>{item.currentStock} {item.unit}</span></td>
                    <td style={{fontSize:12,color:'var(--color-text-muted)'}}>{item.minimumStock} {item.unit}</td>
                    <td>₹{item.pricePerUnit}</td>
                    <td>₹{(item.currentStock*item.pricePerUnit).toLocaleString()}</td>
                    <td>{isLow(item)?<span className="badge badge-warning"><AlertTriangle size={10} style={{display:'inline',marginRight:3}}/>LOW</span>:<span className="badge badge-success">OK</span>}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>{setPurchaseForm({...purchaseForm,itemId:item.id,pricePerUnit:item.pricePerUnit});setShowPurchase(true);}}>
                          <ShoppingCart size={11}/> Purchase
                        </button>
                        <button className="btn btn-ghost btn-icon" style={{color:'var(--color-danger)'}} onClick={()=>{if(confirm(`Delete "${item.name}"?`))deleteItem.mutate(item.id);}}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!items||items.length===0)&&!isLoading&&(
              <div className="empty-state" style={{padding:60}}><div className="empty-state-icon"><Package size={28}/></div><h3>No inventory items</h3><p>Add items to start tracking</p></div>
            )}
          </div>
        )}

        {/* ── Purchase Log Tab ── */}
        {activeTab==='purchases' && (
          <div className="card" style={{padding:32,textAlign:'center'}}>
            <ShoppingCart size={36} style={{margin:'0 auto 12px',opacity:0.3}}/>
            <h3 style={{marginBottom:8}}>Purchase History</h3>
            <p style={{color:'var(--color-text-muted)',fontSize:14}}>Every time you click "Record Purchase", it will appear here with date, quantity, cost and supplier details.</p>
            <p style={{color:'var(--color-text-muted)',fontSize:13,marginTop:8}}>Connect a <code>GET /inventory/purchases</code> endpoint to your backend to display historical records.</p>
          </div>
        )}

        {/* ── Monthly Budget Tab ── */}
        {activeTab==='budget' && (
          <div>
            <div className="stats-grid" style={{marginBottom:24}}>
              <div className="card" style={{padding:20}}>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>THIS MONTH SPENT</div>
                <div style={{fontSize:28,fontWeight:800,color:budgetUsed>80?'#ef4444':budgetUsed>60?'#f59e0b':'#10b981'}}>₹{currentMonthSpend.toLocaleString()}</div>
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginTop:4}}>of ₹{monthlyBudget.toLocaleString()} budget</div>
                <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,marginTop:10}}>
                  <div style={{height:'100%',width:`${budgetUsed}%`,background:budgetUsed>80?'#ef4444':budgetUsed>60?'#f59e0b':'#10b981',borderRadius:3,transition:'width 0.4s'}}/>
                </div>
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginTop:6}}>{Math.round(budgetUsed)}% used · ₹{(monthlyBudget-currentMonthSpend).toLocaleString()} remaining</div>
              </div>
              <div className="card" style={{padding:20}}>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>YEARLY TOTAL ({currentYear})</div>
                <div style={{fontSize:28,fontWeight:800}}>₹{yearlyTotal.toLocaleString()}</div>
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginTop:4}}>Avg ₹{Math.round(yearlyTotal/Math.max(new Date().getMonth()+1,1)).toLocaleString()}/month</div>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="card" style={{padding:24}}>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:20,display:'flex',alignItems:'center',gap:8}}><BarChart3 size={16}/> Monthly Spend {currentYear}</h3>
              <div style={{display:'flex',gap:10,alignItems:'flex-end',height:180}}>
                {mockMonthlySpend.map((m,i)=>{
                  const maxSpend=Math.max(...mockMonthlySpend.map(x=>x.spend),1);
                  const pct=(m.spend/maxSpend)*100;
                  const isCurrent=i===new Date().getMonth();
                  return (
                    <div key={m.month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                      <div style={{fontSize:10,color:'var(--color-text-muted)',fontWeight:600}}>{m.spend>0?`₹${Math.round(m.spend/1000)}k`:''}</div>
                      <div style={{width:'100%',display:'flex',alignItems:'flex-end',height:130}}>
                        <div style={{width:'100%',height:`${pct}%`,minHeight:m.spend>0?4:0,background:isCurrent?'var(--gradient-primary)':'rgba(99,102,241,0.3)',borderRadius:'4px 4px 0 0',transition:'height 0.3s'}}/>
                      </div>
                      <div style={{fontSize:10,color:isCurrent?'var(--color-primary-light)':'var(--color-text-muted)',fontWeight:isCurrent?700:400}}>{m.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-item cost breakdown */}
            <div className="card" style={{padding:0,overflow:'hidden',marginTop:20}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid var(--color-border)',fontWeight:700,fontSize:14}}>Stock Value Breakdown</div>
              <table className="table">
                <thead><tr><th>Item</th><th>Stock</th><th>Unit Cost</th><th>Total Value</th><th>% of Total</th></tr></thead>
                <tbody>
                  {items.map((item:any)=>{
                    const val=item.currentStock*item.pricePerUnit;
                    const pct=(val/(stats?.totalValue||1))*100;
                    return (
                      <tr key={item.id}>
                        <td style={{fontWeight:600}}>{item.name}</td>
                        <td>{item.currentStock} {item.unit}</td>
                        <td>₹{item.pricePerUnit}</td>
                        <td style={{fontWeight:700}}>₹{val.toLocaleString()}</td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{flex:1,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
                              <div style={{height:'100%',width:`${pct}%`,background:'var(--gradient-primary)',borderRadius:2}}/>
                            </div>
                            <span style={{fontSize:12,color:'var(--color-text-muted)',minWidth:36}}>{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddItem&&(
        <div className="modal-overlay" onClick={()=>setShowAddItem(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 style={{fontSize:18,fontWeight:700}}>Add New Inventory Item</h2><button className="btn btn-ghost btn-icon" onClick={()=>setShowAddItem(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="form-group" style={{gridColumn:'1 / -1'}}><label className="form-label">Item Name *</label><input className="form-input" value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})} placeholder="e.g., Tomatoes"/></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-input form-select" value={itemForm.category} onChange={e=>setItemForm({...itemForm,category:e.target.value})}>{['GRAINS','VEGETABLES','DAIRY','SPICES','OIL','OTHER'].map(c=><option key={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Unit</label><select className="form-input form-select" value={itemForm.unit} onChange={e=>setItemForm({...itemForm,unit:e.target.value})}>{['kg','g','L','ml','pieces','packets'].map(u=><option key={u}>{u}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Current Stock</label><input type="number" className="form-input" value={itemForm.currentStock} onChange={e=>setItemForm({...itemForm,currentStock:Number(e.target.value)})}/></div>
                <div className="form-group"><label className="form-label">Minimum Stock</label><input type="number" className="form-input" value={itemForm.minimumStock} onChange={e=>setItemForm({...itemForm,minimumStock:Number(e.target.value)})}/></div>
                <div className="form-group"><label className="form-label">Max Capacity</label><input type="number" className="form-input" value={itemForm.maximumCapacity} onChange={e=>setItemForm({...itemForm,maximumCapacity:Number(e.target.value)})}/></div>
                <div className="form-group"><label className="form-label">Price per Unit (₹)</label><input type="number" className="form-input" value={itemForm.pricePerUnit} onChange={e=>setItemForm({...itemForm,pricePerUnit:Number(e.target.value)})}/></div>
                <div className="form-group" style={{gridColumn:'1 / -1'}}><label className="form-label">Supplier</label><input className="form-input" value={itemForm.supplier} onChange={e=>setItemForm({...itemForm,supplier:e.target.value})} placeholder="Supplier name"/></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowAddItem(false)}>Cancel</button><button className="btn btn-primary" disabled={createItem.isPending||!itemForm.name} onClick={()=>createItem.mutate(itemForm)}>{createItem.isPending?'Adding...':'Add Item'}</button></div>
          </div>
        </div>
      )}

      {/* Record Purchase Modal */}
      {showPurchase&&(
        <div className="modal-overlay" onClick={()=>setShowPurchase(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 style={{fontSize:18,fontWeight:700}}>Record Purchase</h2><button className="btn btn-ghost btn-icon" onClick={()=>setShowPurchase(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div style={{padding:'10px 12px',background:'rgba(16,185,129,0.08)',borderRadius:8,fontSize:12,color:'#10b981',marginBottom:14}}>
                ✅ Recording a purchase will <strong>automatically add the quantity to the item's current stock</strong>.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="form-group"><label className="form-label">Select Item *</label>
                  <select className="form-input form-select" value={purchaseForm.itemId} onChange={e=>setPurchaseForm({...purchaseForm,itemId:e.target.value,pricePerUnit:items.find((i:any)=>i.id===e.target.value)?.pricePerUnit||0})}>
                    <option value="">Choose item...</option>
                    {items.map((item:any)=><option key={item.id} value={item.id}>{item.name} (current: {item.currentStock} {item.unit})</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label className="form-label">Quantity *</label><input type="number" className="form-input" value={purchaseForm.quantity} onChange={e=>setPurchaseForm({...purchaseForm,quantity:Number(e.target.value)})}/></div>
                  <div className="form-group"><label className="form-label">Price/Unit (₹)</label><input type="number" className="form-input" value={purchaseForm.pricePerUnit} onChange={e=>setPurchaseForm({...purchaseForm,pricePerUnit:Number(e.target.value)})}/></div>
                </div>
                <div className="form-group"><label className="form-label">Supplier</label><input className="form-input" value={purchaseForm.supplier} onChange={e=>setPurchaseForm({...purchaseForm,supplier:e.target.value})} placeholder="Supplier name"/></div>
                {purchaseForm.quantity>0&&purchaseForm.pricePerUnit>0&&(
                  <div style={{padding:12,background:'rgba(99,102,241,0.08)',borderRadius:10,fontSize:14,fontWeight:700,color:'var(--color-primary-light)'}}>
                    Total Cost: ₹{(purchaseForm.quantity*purchaseForm.pricePerUnit).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowPurchase(false)}>Cancel</button><button className="btn btn-primary" disabled={recordPurchase.isPending||!purchaseForm.itemId||!purchaseForm.quantity} onClick={()=>recordPurchase.mutate(purchaseForm)}>{recordPurchase.isPending?'Recording...':'Record Purchase'}</button></div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
