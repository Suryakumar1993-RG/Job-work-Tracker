import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';

export default function GRNPage() {
  const { db } = useData();
  const { currentUser } = useAuth();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  
  const canCreate = ["admin", "store_manager", "store_operator"].includes(currentUser.role);
  const grns = db.grns.getAll();

  const filteredGrns = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return grns.filter(g => {
      return g.grnNumber.toLowerCase().includes(q) || 
             g.dnNumber.toLowerCase().includes(q) || 
             g.jobWorkerName.toLowerCase().includes(q);
    });
  }, [grns, searchQuery]);

  const handleOpenGrnForm = () => {
    const dns = db.deliveryNotes.getAll().filter(d => 
      ["at_jobworker", "in_production", "partial_return"].includes(d.status)
    );
    const grnNumber = db.grns.getNextNumber();

    const FormContent = () => {
      const [dnId, setDnId] = useState('');
      const [formData, setFormData] = useState({
        grnNumber: grnNumber,
        grnDate: new Date().toISOString().split("T")[0],
        inspector: currentUser.fullName,
        qcStatus: 'pass',
        vehicle: '',
        lrNumber: '',
        remarks: ''
      });
      const [materials, setMaterials] = useState([]);

      const handleDnChange = (e) => {
        const id = e.target.value;
        setDnId(id);
        if (!id) {
          setMaterials([]);
          return;
        }
        const selectedDn = db.deliveryNotes.getById(id);
        if (!selectedDn) return;

        const initialMats = [];
        selectedDn.materials.forEach(m => {
          const pending = m.qtySent - m.qtyReturned;
          if (pending > 0) {
            initialMats.push({
              id: m.id,
              description: m.description,
              unit: m.unit,
              qtySent: m.qtySent,
              qtyReturned: m.qtyReturned,
              pending: pending,
              recvNow: pending,
              qcPass: pending,
              failReason: 'Dimension mismatch'
            });
          }
        });
        setMaterials(initialMats);
      };

      const updateMaterial = (idx, field, val) => {
        const newMats = [...materials];
        let numVal = parseFloat(val) || 0;
        
        if (field === 'recvNow') {
          if (numVal > newMats[idx].pending) numVal = newMats[idx].pending;
          newMats[idx].recvNow = numVal;
          if (newMats[idx].qcPass > numVal) newMats[idx].qcPass = numVal;
        } else if (field === 'qcPass') {
          if (numVal > newMats[idx].recvNow) numVal = newMats[idx].recvNow;
          newMats[idx].qcPass = numVal;
        } else {
          newMats[idx][field] = val;
        }
        
        setMaterials(newMats);
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        const targetDn = db.deliveryNotes.getById(dnId);
        if (!targetDn) return;

        const receipts = [];
        materials.forEach(matState => {
          const rejected = matState.recvNow - matState.qcPass;
          const reason = rejected > 0 ? matState.failReason : null;

          const mat = targetDn.materials.find(m => m.id === matState.id);
          if (mat) {
            receipts.push({
              materialId: matState.id,
              description: mat.description,
              dnQty: mat.qtySent,
              alreadyReturned: mat.qtyReturned,
              pendingQty: mat.qtySent - mat.qtyReturned,
              receivingNow: matState.recvNow,
              acceptedQty: matState.qcPass,
              rejectedQty: rejected,
              rejectionReason: reason,
              unit: mat.unit
            });

            mat.qtyReturned += matState.recvNow;
            mat.qtyInProcess = Math.max(0, (mat.qtyInProcess || 0) - matState.recvNow);
            
            mat.statusHistory.push({
              status: "partial_return",
              date: formData.grnDate,
              remarks: `GRN Return Received: ${matState.recvNow} (${matState.qcPass} accepted, ${rejected} rejected).`,
              qtyAffected: matState.recvNow
            });

            if (mat.qtySent - mat.qtyReturned === 0) {
              mat.currentStatus = "fully_returned";
              mat.currentProductionStage = null;
            } else {
              mat.currentStatus = "partial_return";
            }
          }
        });

        const newGrn = {
          grnNumber: formData.grnNumber,
          grnDate: formData.grnDate,
          deliveryNoteId: dnId,
          dnNumber: targetDn.dnNumber,
          jobWorkerId: targetDn.jobWorkerId,
          jobWorkerName: targetDn.jobWorkerName,
          materialReceipts: receipts,
          vehicleNumber: formData.vehicle || null,
          lrNumber: formData.lrNumber || null,
          receivedBy: currentUser.fullName,
          inspectionDone: true,
          inspectorName: formData.inspector || null,
          inspectionDate: formData.grnDate,
          qcStatus: formData.qcStatus,
          qcRemarks: formData.remarks,
          status: "confirmed"
        };

        const overallPending = targetDn.materials.reduce((sum, m) => sum + (m.qtySent - m.qtyReturned), 0);
        targetDn.status = overallPending === 0 ? "fully_returned" : "partial_return";

        db.grns.save(newGrn);
        db.deliveryNotes.save(targetDn);

        showToast(`GRN ${newGrn.grnNumber} finalized successfully!`, "success");
        closeModal();
      };

      return (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>GRN Number *</label>
              <input type="text" className="form-control" value={formData.grnNumber} onChange={e => setFormData({...formData, grnNumber: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>GRN Date *</label>
              <input type="date" className="form-control" value={formData.grnDate} onChange={e => setFormData({...formData, grnDate: e.target.value})} required />
            </div>
          </div>

          <div className="form-group">
            <label>Select Outward Delivery Note (Pending Returns) *</label>
            <select className="form-control" value={dnId} onChange={handleDnChange} required>
              <option value="">-- Select Active Delivery Note --</option>
              {dns.map(d => <option key={d.id} value={d.id}>{d.dnNumber} - {d.jobWorkerName} ({d.purpose})</option>)}
            </select>
          </div>

          {dnId && (
            <>
              <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '20px', paddingTop: '14px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>Return Material Verification</label>
                <table className="table-premium" style={{ background: 'rgba(0,0,0,0.15)', marginBottom: '16px' }}>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Sent</th>
                      <th>Returned</th>
                      <th>Pending</th>
                      <th>Receiving Now *</th>
                      <th>QC Pass *</th>
                      <th>QC Reject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m, idx) => {
                      const rejected = m.recvNow - m.qcPass;
                      return (
                        <tr key={m.id}>
                          <td><strong>{m.description}</strong></td>
                          <td>{m.qtySent} {m.unit}</td>
                          <td>{m.qtyReturned}</td>
                          <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{m.pending}</td>
                          <td>
                            <input type="number" className="form-control" style={{ maxWidth: '90px', padding: '6px' }} value={m.recvNow} onChange={e => updateMaterial(idx, 'recvNow', e.target.value)} min="1" max={m.pending} required />
                          </td>
                          <td>
                            <input type="number" className="form-control" style={{ maxWidth: '90px', padding: '6px' }} value={m.qcPass} onChange={e => updateMaterial(idx, 'qcPass', e.target.value)} min="0" max={m.recvNow} required />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge" style={{ background: rejected > 0 ? 'var(--danger-bg)' : 'rgba(255,255,255,0.08)', color: rejected > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{rejected}</span>
                              {rejected > 0 && (
                                <select className="form-control" style={{ padding: '4px', maxWidth: '130px' }} value={m.failReason} onChange={e => updateMaterial(idx, 'failReason', e.target.value)} required>
                                  <option value="Dimension mismatch">Dimension mismatch</option>
                                  <option value="Surface defect">Surface defect</option>
                                  <option value="Crack / Structural">Structural defect</option>
                                  <option value="Bending / Warp">Bending / Warp</option>
                                  <option value="Under-processed">Under-processed</option>
                                  <option value="Other">Other</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>QC Inspector *</label>
                    <input type="text" className="form-control" value={formData.inspector} onChange={e => setFormData({...formData, inspector: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Overall QC Verdict *</label>
                    <select className="form-control" value={formData.qcStatus} onChange={e => setFormData({...formData, qcStatus: e.target.value})}>
                      <option value="pass">PASS (Send to Stock)</option>
                      <option value="fail">FAIL (Reject / Return)</option>
                      <option value="conditional">CONDITIONAL PASS</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Return Vehicle No</label>
                    <input type="text" className="form-control" value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} placeholder="e.g. MH-12-PQ-1234" />
                  </div>
                  <div className="form-group">
                    <label>LR / GR Number</label>
                    <input type="text" className="form-control" value={formData.lrNumber} onChange={e => setFormData({...formData, lrNumber: e.target.value})} placeholder="Return Lorry Receipt No." />
                  </div>
                </div>
                <div className="form-group">
                  <label>QC Inspection Remarks</label>
                  <textarea className="form-control" rows="2" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Describe dimensional checks, defects..."></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm & Finalize GRN</button>
              </div>
            </>
          )}
        </form>
      );
    };

    openModal("📥 Create Goods Receipt Note", <FormContent />);
  };

  const handleViewDetails = (grn) => {
    const ModalContent = () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="grid-details" style={{ display: 'flex', gap: '15px' }}>
          <div className="detail-block"><h4>GRN Number</h4><p>{grn.grnNumber}</p></div>
          <div className="detail-block"><h4>GRN Date</h4><p>{formatDate(grn.grnDate)}</p></div>
          <div className="detail-block"><h4>Against DN No.</h4><p>{grn.dnNumber}</p></div>
          <div className="detail-block"><h4>Job Worker</h4><p>{grn.jobWorkerName}</p></div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Returned Material Checklist</h4>
          <table className="table-premium" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <thead>
              <tr>
                <th>Material</th>
                <th>DN Qty</th>
                <th>Pending</th>
                <th>Received Now</th>
                <th>QC Passed</th>
                <th>QC Rejected</th>
                <th>Rejection Reason</th>
              </tr>
            </thead>
            <tbody>
              {grn.materialReceipts.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.description}</strong></td>
                  <td>{r.dnQty}</td>
                  <td>{r.pendingQty}</td>
                  <td><strong>{r.receivingNow}</strong></td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{r.acceptedQty}</td>
                  <td style={{ color: r.rejectedQty > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>{r.rejectedQty}</td>
                  <td><i>{r.rejectionReason || "N/A"}</i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid-2">
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>🔍 Quality Control (QC) Report</h4>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              <div>QC Inspection: <strong>{grn.inspectionDone ? "Completed" : "Pending"}</strong></div>
              <div>Inspector Name: <strong>{grn.inspectorName || "N/A"}</strong></div>
              <div>Inspection Date: <strong>{formatDate(grn.inspectionDate)}</strong></div>
              <div>Overall Decision: <strong>{grn.qcStatus.toUpperCase()}</strong></div>
              <div>QC Remarks: <i>"{grn.qcRemarks || 'No remarks'}"</i></div>
            </div>
          </div>
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>🚚 Return Logistis & Signoff</h4>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              <div>Return Vehicle: <strong>{grn.vehicleNumber || "N/A"}</strong></div>
              <div>LR Number: <strong>{grn.lrNumber || "N/A"}</strong></div>
              <div>Received By: <strong>{grn.receivedBy}</strong></div>
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Logged: {new Date(grn.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
          <button className="btn btn-secondary" onClick={closeModal}>Close Details</button>
        </div>
      </div>
    );

    openModal(`📥 Goods Receipt Note Details - ${grn.grnNumber}`, <ModalContent />);
  };

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1>Goods Receipt Note (GRN)</h1>
          <p>Record inward materials and Quality Control</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '250px' }}>
          <input type="text" className="form-control" placeholder="Search GRN No. or Job Worker..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={handleOpenGrnForm}>📥 Create GRN</button>
        )}
      </div>

      <div className="card glass table-responsive">
        <table className="table-premium">
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>GRN Date</th>
              <th>Against DN</th>
              <th>Job Worker</th>
              <th>Material Status</th>
              <th>QC Decision</th>
              <th>Received By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrns.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No GRN records found</td></tr>
            ) : (
              filteredGrns.map(g => {
                const totalRecv = g.materialReceipts.reduce((sum, r) => sum + r.receivingNow, 0);
                const totalPass = g.materialReceipts.reduce((sum, r) => sum + r.acceptedQty, 0);

                let qcBadge = "";
                if (g.qcStatus === "pass") {
                  qcBadge = <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>PASS</span>;
                } else if (g.qcStatus === "fail") {
                  qcBadge = <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>REJECTED</span>;
                } else {
                  qcBadge = <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>CONDITIONAL</span>;
                }

                return (
                  <tr key={g.id}>
                    <td><strong>{g.grnNumber}</strong></td>
                    <td><code>{formatDate(g.grnDate)}</code></td>
                    <td><strong>{g.dnNumber}</strong></td>
                    <td>{g.jobWorkerName}</td>
                    <td>Received {totalRecv} (Passed: {totalPass})</td>
                    <td>{qcBadge}</td>
                    <td>{g.receivedBy}</td>
                    <td>
                      <button className="btn btn-secondary btn-icon" onClick={() => handleViewDetails(g)} title="View Details">👁️</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
