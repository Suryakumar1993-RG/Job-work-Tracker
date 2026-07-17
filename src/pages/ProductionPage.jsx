import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { daysBetween, formatDate } from '../utils/helpers';

export default function ProductionPage() {
  const { db } = useData();
  const { currentUser } = useAuth();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [workerFilter, setWorkerFilter] = useState('');

  const dns = db.deliveryNotes.getAll();
  const workers = db.jobWorkers.getAll();

  const activeItems = useMemo(() => {
    const items = [];
    dns.forEach(dn => {
      if (["at_jobworker", "in_production", "partial_return"].includes(dn.status)) {
        dn.materials.forEach(mat => {
          const pending = mat.qtySent - mat.qtyReturned;
          const matchesVendor = currentUser.role !== "job_worker" || dn.jobWorkerId === currentUser.linkedJobWorkerId;
          
          if (pending > 0 && matchesVendor) {
            const wip = mat.wipQuantities || { [mat.currentProductionStage || "queued"]: pending };
            
            Object.keys(wip).forEach(stageId => {
              if (wip[stageId] > 0) {
                items.push({
                  id: `${mat.id}-${stageId}`,
                  dnId: dn.id,
                  dnNumber: dn.dnNumber,
                  jobWorkerName: dn.jobWorkerName,
                  jobWorkerId: dn.jobWorkerId,
                  material: mat,
                  stageId: stageId,
                  stageQty: wip[stageId]
                });
              }
            });
          }
        });
      }
    });
    return items;
  }, [dns, currentUser]);

  const filteredItems = useMemo(() => {
    return workerFilter 
      ? activeItems.filter(item => item.jobWorkerId === workerFilter)
      : activeItems;
  }, [activeItems, workerFilter]);

  const stages = [
    { id: "queued", label: "Queued", color: "#38bdf8" },
    { id: "in_process", label: "In Process", color: "#a78bfa" },
    { id: "partially_processed", label: "Partially Processed", color: "#f472b6" },
    { id: "quality_check", label: "Quality Check", color: "#fbbf24" },
    { id: "rework", label: "Rework / Reject", color: "#f87171" },
    { id: "ready_for_dispatch", label: "Ready for Dispatch", color: "#34d399" }
  ];

  const handleCardClick = (dnId, matId, sourceStageId, currentStageQty) => {
    const dn = db.deliveryNotes.getById(dnId);
    if (!dn) return;
    const mat = dn.materials.find(m => m.id === matId);
    if (!mat) return;

    const canUpdate = ["admin", "store_manager", "job_worker"].includes(currentUser.role);
    if (!canUpdate) {
      showToast("Only vendors or managers can update production status", "error");
      return;
    }

    const FormContent = () => {
      const [formData, setFormData] = useState({
        targetStage: '',
        qtyProcessed: currentStageQty,
        qtyRejected: 0,
        date: new Date().toISOString().split("T")[0],
        batch: `BATCH-${dn.dnNumber.split('/').pop()}`,
        remarks: "",
        estDate: mat.estimatedReturnDate || ''
      });

      const qtyPending = currentStageQty - formData.qtyProcessed - formData.qtyRejected;

      const handleSubmit = (e) => {
        e.preventDefault();
        const targetDn = db.deliveryNotes.getById(dnId);
        const materialObj = targetDn.materials.find(mo => mo.id === matId);
        
        if (materialObj) {
          const procQty = parseFloat(formData.qtyProcessed) || 0;
          const rejQty = parseFloat(formData.qtyRejected) || 0;
          
          if (qtyPending < 0) {
            showToast("Total processed + rejected cannot exceed available stage quantity", "error");
            return;
          }

          if (!materialObj.wipQuantities) {
            materialObj.wipQuantities = { [sourceStageId]: currentStageQty };
          }
          
          // Deduct from source stage
          materialObj.wipQuantities[sourceStageId] -= (procQty + rejQty);
          
          // Add to target stage (Processed)
          if (procQty > 0 && formData.targetStage) {
            materialObj.wipQuantities[formData.targetStage] = (materialObj.wipQuantities[formData.targetStage] || 0) + procQty;
            materialObj.currentProductionStage = formData.targetStage; // Update "latest" stage pointer
            
            if (formData.targetStage === "ready_for_dispatch") {
              materialObj.qtyCompleted = (materialObj.qtyCompleted || 0) + procQty;
            }
          }

          // Add to rework stage (Rejected)
          if (rejQty > 0) {
            materialObj.wipQuantities["rework"] = (materialObj.wipQuantities["rework"] || 0) + rejQty;
          }

          materialObj.estimatedReturnDate = formData.estDate;

          materialObj.productionHistory.push({
            stage: formData.targetStage || sourceStageId,
            date: formData.date,
            qtyProcessed: procQty,
            qtyRejected: rejQty,
            batchNumber: formData.batch || null,
            qualityRemarks: formData.remarks,
            expectedCompletionDate: formData.estDate || null,
            updatedAt: new Date().toISOString()
          });

          targetDn.status = "in_production";
          db.deliveryNotes.save(targetDn);
          showToast("Production stage updated successfully!", "success");
          closeModal();
        }
      };

      return (
        <div className="grid-2">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Material Details (Stage: {stages.find(s=>s.id===sourceStageId)?.label})</label>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                <div>Challan No: <strong>{dn.dnNumber}</strong></div>
                <div>Material: <strong>{mat.description}</strong></div>
                <div>Qty Available in this Stage: <strong>{currentStageQty} {mat.unit}</strong></div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Move To Stage</label>
                <select className="form-control" value={formData.targetStage} onChange={e => setFormData({...formData, targetStage: e.target.value})} required={formData.qtyProcessed > 0}>
                  <option value="">-- Select Target Stage --</option>
                  {stages.filter(s => s.id !== "rework" && s.id !== sourceStageId).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ color: 'var(--success)' }}>Processed Qty *</label>
                <input type="number" className="form-control" value={formData.qtyProcessed} onChange={e => setFormData({...formData, qtyProcessed: parseFloat(e.target.value) || 0})} min="0" max={currentStageQty} required />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--danger)' }}>Rejected Qty (to Rework)</label>
                <input type="number" className="form-control" value={formData.qtyRejected} onChange={e => setFormData({...formData, qtyRejected: parseFloat(e.target.value) || 0})} min="0" max={currentStageQty} required />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Pending in Current Stage</label>
              <input type="number" className="form-control" value={qtyPending} disabled style={{ background: 'rgba(0,0,0,0.05)', color: qtyPending < 0 ? 'var(--danger)' : 'inherit' }} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Update Date *</label>
                <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Batch / Lot Number</label>
                <input type="text" className="form-control" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} placeholder="e.g. LOT-A12" />
              </div>
            </div>

            <div className="form-group">
              <label>Quality & Process Remarks *</label>
              <textarea className="form-control" rows="2" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Describe progress, delay details..." required></textarea>
            </div>

            <div className="form-group">
              <label>Estimated Completion Date</label>
              <input type="date" className="form-control" value={formData.estDate} onChange={e => setFormData({...formData, estDate: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
              <button type="submit" className="btn btn-primary" disabled={qtyPending < 0}>💾 Update Production Stage</button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Stage Processing Log History</h4>
            <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '6px' }}>
              <div className="timeline-list">
                {mat.productionHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No logs registered</p>
                ) : (
                  mat.productionHistory.map((h, idx) => (
                    <div key={idx} className="timeline-event">
                      <div className="timeline-event-header">
                        <strong>{h.stage.replace("_", " ").toUpperCase()}</strong>
                        <span>{formatDate(h.date)}</span>
                      </div>
                      <div className="timeline-event-content">
                        Processed: <strong>{h.qtyProcessed || 0}</strong> | 
                        Rejected: <strong style={{ color: h.qtyRejected > 0 ? 'var(--danger)' : 'inherit' }}>{h.qtyRejected || 0}</strong><br />
                        Remarks: <i>"{h.qualityRemarks || 'None'}"</i><br />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Batch: {h.batchNumber || 'N/A'} | Updated: {new Date(h.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    openModal(`⚙️ Update Production Status — ${dn.dnNumber}`, <FormContent />);
  };

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1>Production Tracking</h1>
          <p>Kanban board for material processing</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '250px' }}>
          <select 
            className="form-control" 
            value={workerFilter} 
            onChange={(e) => setWorkerFilter(e.target.value)}
            disabled={currentUser.role === 'job_worker'}
          >
            <option value="">All Job Workers</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.companyName}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click on any material card to update production status</div>
      </div>

      <div className="kanban-board">
        {stages.map(stage => {
          const stageItems = filteredItems.filter(item => item.stageId === stage.id);
          
          return (
            <div key={stage.id} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: stage.color }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></span>
                  {stage.label}
                </span>
                <span className="kanban-col-count">{stageItems.length}</span>
              </div>
              
              <div className="kanban-cards-wrapper">
                {stageItems.map(item => {
                  const total = item.material.qtySent;
                  const completed = item.material.qtyCompleted || 0;
                  const percent = Math.min(100, Math.round((completed / total) * 100));
                  
                  const latestUpdate = item.material.productionHistory.filter(h => h.stage === stage.id).pop();
                  const daysAtStage = latestUpdate ? daysBetween(latestUpdate.date) : 0;
                  
                  const borderStyle = daysAtStage > 10 
                    ? { borderLeftColor: 'var(--danger)', animation: 'pulseBorder 2s infinite' } 
                    : { borderLeftColor: stage.color };

                  return (
                    <div 
                      key={item.id} 
                      className="card glass kanban-card" 
                      style={borderStyle}
                      onClick={() => handleCardClick(item.dnId, item.material.id, item.stageId, item.stageQty)}
                    >
                      <div className="kanban-card-dn">{item.dnNumber}</div>
                      <div className="kanban-card-title">{item.material.description}</div>
                      
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Qty: {item.stageQty} {item.material.unit}
                      </div>

                      <div className="kanban-card-progress" style={{ marginTop: '8px' }} title={`Completed: ${percent}%`}>
                        <div className="kanban-card-progress-bar" style={{ width: `${percent}%`, background: stage.color }}></div>
                      </div>
                      
                      <div className="kanban-card-footer">
                        <span>{item.jobWorkerName.split(" ")[0]}</span>
                        <span style={{ color: daysAtStage > 10 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
                          {daysAtStage > 10 ? '⚠ ' : ''}{daysAtStage} Days
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
