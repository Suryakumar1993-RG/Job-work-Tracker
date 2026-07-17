import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { daysBetween, formatDate } from '../utils/helpers';

export default function AcceptancePage() {
  const { db } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [selectedDnId, setSelectedDnId] = useState(null);

  if (!["admin", "job_worker"].includes(currentUser.role)) {
    return (
      <div className="card glass text-center" style={{ padding: '40px' }}>
        <h3 style={{ color: 'var(--danger)' }}>🚨 Access Denied</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
          Only job workers (vendors) or admins can access the Delivery Acceptance screen.
        </p>
      </div>
    );
  }

  const dns = db.deliveryNotes.getAll();
  const transitDns = dns.filter(d => {
    const matchesStatus = d.status === "in_transit";
    const matchesVendor = currentUser.role === "admin" || d.jobWorkerId === currentUser.linkedJobWorkerId;
    return matchesStatus && matchesVendor;
  });

  const selectedDn = selectedDnId ? db.deliveryNotes.getById(selectedDnId) : null;

  const AcceptanceForm = ({ dn }) => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split("T")[0],
      receiver: currentUser.fullName,
      designation: '',
      remarks: '',
      confirm: false
    });

    const [materials, setMaterials] = useState(() => 
      dn.materials.map(m => ({
        id: m.id,
        description: m.description,
        hsnCode: m.hsnCode,
        qtySent: m.qtySent,
        unit: m.unit,
        recQty: m.qtySent,
        condition: 'good',
        remarks: ''
      }))
    );

    const updateMaterial = (idx, field, val) => {
      const newMats = [...materials];
      if (field === 'recQty') {
        let numVal = parseFloat(val) || 0;
        if (numVal > newMats[idx].qtySent) numVal = newMats[idx].qtySent;
        newMats[idx][field] = numVal;
      } else {
        newMats[idx][field] = val;
      }
      setMaterials(newMats);
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      const targetDn = db.deliveryNotes.getById(dn.id);
      if (!targetDn) return;

      materials.forEach(matState => {
        const mat = targetDn.materials.find(m => m.id === matState.id);
        if (mat) {
          const shortage = mat.qtySent - matState.recQty;
          mat.qtyAcceptedByVendor = matState.recQty;
          mat.qtyShortage = shortage;
          
          mat.qtyInProcess = matState.recQty; 
          mat.currentProductionStage = "queued";
          mat.wipQuantities = { queued: matState.recQty };
          mat.currentStatus = "at_jobworker";

          mat.statusHistory.push({
            status: "accepted",
            date: formData.date,
            remarks: `Vendor receipt checked. Accepted: ${matState.recQty}, Shortage: ${shortage}. Condition: ${matState.condition}. ${matState.remarks}`,
            qtyAffected: matState.recQty
          });

          mat.productionHistory.push({
            stage: "queued",
            date: formData.date,
            qtyProcessed: matState.recQty,
            batchNumber: "AUTO-" + targetDn.dnNumber.split("/").pop(),
            qualityRemarks: "Material accepted and queued for production",
            expectedCompletionDate: mat.estimatedReturnDate,
            updatedAt: new Date().toISOString()
          });
        }
      });

      targetDn.status = "at_jobworker";
      targetDn.remarks += `\n[Acceptance by ${formData.receiver} on ${formData.date}]: ${formData.remarks}`;
      
      db.deliveryNotes.save(targetDn);
      showToast(`Delivery note ${targetDn.dnNumber} acknowledged successfully!`, "success");
      setSelectedDnId(null);
    };

    return (
      <>
        <h3 style={{ marginBottom: '20px' }}>Acknowledge Material Receipt: {dn.dnNumber}</h3>
        
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.6' }}>
          <div className="grid-details" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '0', gap: '10px' }}>
            <div>Sender: <strong>ABC Manufacturing</strong></div>
            <div>Dispatch Date: <strong>{formatDate(dn.dnDate)}</strong></div>
            <div>Vehicle Number: <strong>{dn.vehicleNumber || 'N/A'}</strong></div>
            <div>Driver Name: <strong>{dn.driverName || 'N/A'}</strong></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <table className="table-premium" style={{ background: 'rgba(0,0,0,0.15)', marginBottom: '20px' }}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Sent Qty</th>
                <th>Received Qty *</th>
                <th>Condition *</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, idx) => (
                <tr key={m.id}>
                  <td><strong>{m.description}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>HSN: {m.hsnCode}</span></td>
                  <td>{m.qtySent} {m.unit}</td>
                  <td>
                    <input type="number" className="form-control" style={{ maxWidth: '100px', padding: '6px 10px' }} value={m.recQty} onChange={e => updateMaterial(idx, 'recQty', e.target.value)} min="0" max={m.qtySent} required />
                  </td>
                  <td>
                    <select className="form-control" style={{ padding: '6px 10px' }} value={m.condition} onChange={e => updateMaterial(idx, 'condition', e.target.value)} required>
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="partially_damaged">Partially Damaged</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control" style={{ padding: '6px 10px' }} placeholder="e.g. minor scratches" value={m.remarks} onChange={e => updateMaterial(idx, 'remarks', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-row">
            <div className="form-group">
              <label>Receipt Date *</label>
              <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Receiver Name *</label>
              <input type="text" className="form-control" value={formData.receiver} onChange={e => setFormData({...formData, receiver: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Designation *</label>
              <input type="text" className="form-control" placeholder="e.g. Supervisor" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required />
            </div>
          </div>

          <div className="form-group">
            <label>Overall Remarks</label>
            <textarea className="form-control" rows="2" placeholder="Enter physical inspection details..." value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})}></textarea>
          </div>

          <div className="form-group">
            <label className="form-check">
              <input type="checkbox" checked={formData.confirm} onChange={e => setFormData({...formData, confirm: e.target.checked})} required />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>☑ I confirm physical verification & counts of materials listed above.</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Confirm Physical Receipt & Accept Delivery</button>
          </div>
        </form>
      </>
    );
  };

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1>Delivery Acceptance</h1>
          <p>Acknowledge receipt of materials sent from principal</p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ marginBottom: '10px' }}>Incoming Dispatches (In Transit)</h3>
          <div style={{ overflowY: 'auto', maxHeight: '65vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transitDns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No pending material in transit.</div>
            ) : (
              transitDns.map(d => {
                const docAge = daysBetween(d.dnDate);
                const isSelected = selectedDnId === d.id;
                
                return (
                  <div 
                    key={d.id} 
                    className="card glass" 
                    onClick={() => setSelectedDnId(d.id)}
                    style={{ 
                      padding: '16px', 
                      cursor: 'pointer', 
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.15)', 
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-glass)',
                      transition: 'transform 0.2s',
                      transform: isSelected ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>{d.dnNumber}</strong>
                      <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>{docAge} days in transit</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <div>From: <strong>ABC Manufacturing</strong></div>
                      <div>Qty: <strong>{d.materials.reduce((sum,m)=>sum+m.qtySent, 0)} {d.materials[0]?.unit}</strong></div>
                      <div>Dispatch date: {formatDate(d.dnDate)}</div>
                    </div>
                    {!isSelected && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Verify & Accept ▶</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card glass">
          {selectedDn ? (
            <AcceptanceForm dn={selectedDn} key={selectedDn.id} />
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>📦</span>
              <h3>Select a dispatch from the left panel</h3>
              <p>Verify quantities and record physical receipt status.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
