import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { daysBetween, formatDate, getAgeColor, getStageColor } from '../utils/helpers';

export default function AgingPage() {
  const { db } = useData();
  const { currentUser } = useAuth();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("summary");
  
  // Data State
  const dns = db.deliveryNotes.getAll();
  const activeDns = dns.filter(dn => ["at_jobworker", "in_production", "partial_return"].includes(dn.status));

  // Shared export logic
  const exportCsv = (reportType) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let fileName = "aging_report.csv";

    if (reportType === "summary") {
      csvContent += "Challan Number,Challan Date,Job Worker,Material,Qty Sent,Qty Pending,Document Age (Days),Status\n";
      activeDns.forEach(d => {
        const age = daysBetween(d.dnDate);
        d.materials.forEach(m => {
          const pending = m.qtySent - m.qtyReturned;
          if (pending > 0) {
            csvContent += `"${d.dnNumber}","${d.dnDate}","${d.jobWorkerName}","${m.description}",${m.qtySent},${pending},${age},"${m.currentProductionStage || 'at jobworker'}"\n`;
          }
        });
      });
      fileName = "Aging_Summary_Report.csv";
    } else if (reportType === "nonmoving") {
      csvContent += "Principal DN,Principal Date,Latest Refreshed DN,Latest Date,Job Worker,Material,Original Principal Qty,Qty Pending,Document Age,Material Age (True Age),Refreshes\n";
      activeDns.forEach(d => {
        const docAge = daysBetween(d.dnDate);
        const principalDate = d.isRefresh ? d.refreshHistory[0].date : d.dnDate;
        const matAge = daysBetween(principalDate);
        const principalNo = d.isRefresh ? d.principalChallanNumber : d.dnNumber;
        const principalDtVal = d.isRefresh ? d.refreshHistory[0].date : d.dnDate;

        d.materials.forEach(m => {
          const pending = m.qtySent - m.qtyReturned;
          if (pending > 0) {
            const origQty = m.originalQtyInPrincipal || m.qtySent;
            csvContent += `"${principalNo}","${principalDtVal}","${d.dnNumber}","${d.dnDate}","${d.jobWorkerName}","${m.description}",${origQty},${pending},${docAge},${matAge},${d.refreshCount}\n`;
          }
        });
      });
      fileName = "Non_Moving_Material_Report.csv";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${fileName} exported successfully!`, "success");
  };

  // --------------------------------------------------------------------------------
  // Tab 1: Summary
  // --------------------------------------------------------------------------------
  const SummaryTab = () => {
    const [search, setSearch] = useState('');
    const [bucket, setBucket] = useState('');

    let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
    activeDns.forEach(dn => {
      const docAge = daysBetween(dn.dnDate);
      const qty = dn.materials.reduce((sum, m) => sum + (m.qtySent - m.qtyReturned), 0);
      if (docAge <= 30) b1 += qty;
      else if (docAge <= 90) b2 += qty;
      else if (docAge <= 120) b3 += qty;
      else b4 += qty;
    });

    const filtered = useMemo(() => {
      const q = search.toLowerCase();
      return activeDns.filter(d => {
        const age = daysBetween(d.dnDate);
        const matchesQ = d.jobWorkerName.toLowerCase().includes(q) || 
                         d.dnNumber.toLowerCase().includes(q) ||
                         d.materials.some(m => m.description.toLowerCase().includes(q));

        let matchesBucket = true;
        if (bucket === "0-30") matchesBucket = age <= 30;
        else if (bucket === "31-90") matchesBucket = age > 30 && age <= 90;
        else if (bucket === "91-120") matchesBucket = age > 90 && age <= 120;
        else if (bucket === "120+") matchesBucket = age > 120;

        return matchesQ && matchesBucket;
      });
    }, [search, bucket, activeDns]);

    return (
      <div className={`tab-content ${activeTab === 'summary' ? 'active' : ''}`}>
        <div className="grid-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="card glass text-center" style={{ borderLeft: '4px solid var(--success)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>0 - 30 Days</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px', color: 'var(--success)' }}>{b1} Units</div>
          </div>
          <div className="card glass text-center" style={{ borderLeft: '4px solid var(--warning)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>31 - 90 Days</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px', color: 'var(--warning)' }}>{b2} Units</div>
          </div>
          <div className="card glass text-center" style={{ borderLeft: '4px solid #f97316' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>91 - 120 Days</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px', color: '#f97316' }}>{b3} Units</div>
          </div>
          <div className="card glass text-center" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>120+ Days (Alert)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px', color: 'var(--danger)' }}>{b4} Units</div>
          </div>
        </div>

        <div className="filter-bar" style={{ marginTop: '20px' }}>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <input type="text" className="form-control" placeholder="Search by Job Worker or Material..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <select className="form-control" value={bucket} onChange={e => setBucket(e.target.value)}>
              <option value="">All Age Buckets</option>
              <option value="0-30">0-30 Days</option>
              <option value="31-90">31-90 Days</option>
              <option value="91-120">91-120 Days</option>
              <option value="120+">120+ Days</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => exportCsv('summary')}>📥 Export CSV</button>
        </div>

        <div className="card glass table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>DN Number</th>
                <th>Challan Date</th>
                <th>Job Worker</th>
                <th>Material</th>
                <th>Sent Qty</th>
                <th>Pending</th>
                <th>Document Age</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active materials tracked</td></tr>
              ) : (
                filtered.map(d => {
                  const age = daysBetween(d.dnDate);
                  const ageColor = getAgeColor(age);

                  return d.materials.map(m => {
                    const pending = m.qtySent - m.qtyReturned;
                    if (pending <= 0) return null;
                    const stageColor = getStageColor(m.currentProductionStage);

                    return (
                      <tr key={m.id}>
                        <td><strong>{d.dnNumber}</strong></td>
                        <td><code>{formatDate(d.dnDate)}</code></td>
                        <td><strong>{d.jobWorkerName}</strong></td>
                        <td>{m.description}</td>
                        <td>{m.qtySent} {m.unit}</td>
                        <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{pending} {m.unit}</td>
                        <td>
                          <span className="badge" style={{ background: ageColor.bg, color: ageColor.text, border: `1px solid ${ageColor.text}22` }}>
                            {age} Days
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: stageColor.bg, color: stageColor.text }}>
                            {m.currentProductionStage || "at jobworker"}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------------
  // Tab 2: Non-Moving Analysis
  // --------------------------------------------------------------------------------
  const NonMovingTab = () => {
    const [search, setSearch] = useState('');
    const [refType, setRefType] = useState('');

    const filtered = useMemo(() => {
      const q = search.toLowerCase();
      return activeDns.filter(d => {
        const matchesQ = d.dnNumber.toLowerCase().includes(q) || 
                         d.jobWorkerName.toLowerCase().includes(q) ||
                         (d.principalChallanNumber && d.principalChallanNumber.toLowerCase().includes(q));

        let matchesRef = true;
        if (refType === "0") matchesRef = d.refreshCount === 0;
        else if (refType === "1") matchesRef = d.refreshCount === 1;
        else if (refType === "2+") matchesRef = d.refreshCount >= 2;

        return matchesQ && matchesRef;
      });
    }, [search, refType, activeDns]);

    return (
      <div className={`tab-content ${activeTab === 'nonmoving' ? 'active' : ''}`}>
        <div style={{ background: 'rgba(239,68,68,0.08)', borderLeft: '4px solid var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', lineHeight: '1.5' }}>
          <strong>💡 Non-Moving Age Calculation:</strong> For refreshed challans, the Document Age resets back to 0 every 120 days. However, the <strong>Material Age (True Age)</strong> shown in this report computes age strictly from the <strong>original/principal dispatch date</strong>. This tracks non-moving inventory lying with job workers across multiple refreshes.
        </div>

        <div className="filter-bar">
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <input type="text" className="form-control" placeholder="Search by Principal DN or Job Worker..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <select className="form-control" value={refType} onChange={e => setRefType(e.target.value)}>
              <option value="">All Refresh Count</option>
              <option value="0">0 Refreshes (Original)</option>
              <option value="1">1 Refresh</option>
              <option value="2+">2+ Refreshes</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => exportCsv('nonmoving')}>📥 Export CSV</button>
        </div>

        <div className="card glass table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Principal DN No. & Date</th>
                <th>Latest Refreshed DN No.</th>
                <th>Refreshes</th>
                <th>Job Worker</th>
                <th>Material Description</th>
                <th>Qty Sent (Principal)</th>
                <th>Qty Pending</th>
                <th>Document Age</th>
                <th>Material Age (True Age)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active materials tracked</td></tr>
              ) : (
                filtered.map(d => {
                  const docAge = daysBetween(d.dnDate);
                  const principalDate = d.isRefresh ? d.refreshHistory[0].date : d.dnDate;
                  const matAge = daysBetween(principalDate);
                  const matAgeStyle = getAgeColor(matAge);

                  const principalDisplayNumber = d.isRefresh ? d.principalChallanNumber : d.dnNumber;
                  const principalDisplayDate = d.isRefresh ? d.refreshHistory[0].date : d.dnDate;

                  return d.materials.map(m => {
                    const pending = m.qtySent - m.qtyReturned;
                    if (pending <= 0) return null;
                    const originalPrincipalQty = m.originalQtyInPrincipal || m.qtySent;

                    return (
                      <tr key={m.id}>
                        <td>
                          <strong>{principalDisplayNumber}</strong><br />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(principalDisplayDate)}</span>
                        </td>
                        <td>
                          <strong>{d.dnNumber}</strong><br />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(d.dnDate)}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                            {d.refreshCount} Times
                          </span>
                          {d.isRefresh && (
                            <button className="btn btn-secondary btn-icon" onClick={() => window.location.href=`/delivery-notes?id=${d.id}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }} title="View Chain">🔗 Chain</button>
                          )}
                        </td>
                        <td><strong>{d.jobWorkerName}</strong></td>
                        <td>{m.description}</td>
                        <td>{originalPrincipalQty} {m.unit}</td>
                        <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{pending} {m.unit}</td>
                        <td>{docAge} Days</td>
                        <td>
                          <span className="badge" style={{ background: matAgeStyle.bg, color: matAgeStyle.text, fontSize: '0.85rem', fontWeight: 700, border: `1px solid ${matAgeStyle.text}33` }}>
                            {matAge} Days
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------------
  // Tab 3: Challan Refresh
  // --------------------------------------------------------------------------------
  const RefreshTab = () => {
    const refreshDue = activeDns.filter(d => {
      const docAge = daysBetween(d.dnDate);
      return docAge >= 105;
    });

    const triggerRefreshForm = (dnId) => {
      const dn = db.deliveryNotes.getById(dnId);
      if (!dn) return;
      const nextNumber = db.deliveryNotes.getNextNumber();

      const FormContent = () => {
        const [formData, setFormData] = useState({
          vehicle: dn.vehicleNumber || '',
          lr: dn.lrNumber || '',
          remarks: `120-Day Renewal of ${dn.dnNumber}`,
          varianceReason: ''
        });

        const [materials, setMaterials] = useState(() => 
          dn.materials.map(m => {
            const pending = m.qtySent - m.qtyReturned;
            return {
              id: m.id,
              description: m.description,
              qtySent: m.qtySent,
              unit: m.unit,
              qtyReturned: m.qtyReturned,
              scrap: 0,
              pending: pending,
              refreshQty: pending,
              origPending: pending
            };
          })
        );

        const hasVariance = materials.some(m => m.scrap > 0 || m.refreshQty !== m.pending);

        const updateMaterial = (idx, field, val) => {
          const newMats = [...materials];
          let numVal = parseFloat(val) || 0;
          
          if (field === 'scrap') {
            newMats[idx].scrap = numVal;
            newMats[idx].pending = newMats[idx].origPending - numVal;
            newMats[idx].refreshQty = newMats[idx].pending;
          } else if (field === 'refreshQty') {
            newMats[idx].refreshQty = numVal;
          }
          setMaterials(newMats);
        };

        const handleSubmit = (e) => {
          e.preventDefault();
          if (hasVariance && !formData.varianceReason.trim()) {
            showToast("Variance explanation is required.", "error");
            return;
          }

          const targetDn = db.deliveryNotes.getById(dn.id);
          const refreshedMaterials = [];

          materials.forEach(matState => {
            const mat = targetDn.materials.find(m => m.id === matState.id);
            if (mat) {
              const pendingBefore = mat.qtySent - mat.qtyReturned;
              const variance = matState.refreshQty - (pendingBefore - matState.scrap);

              refreshedMaterials.push({
                id: "mat_ref_" + Math.random().toString(36).substr(2, 5),
                description: mat.description,
                hsnCode: mat.hsnCode,
                qtySent: matState.refreshQty,
                qtyReturned: 0,
                qtyInProcess: matState.refreshQty,
                qtyCompleted: 0,
                qtyAcceptedByVendor: matState.refreshQty,
                qtyShortage: 0,
                unit: mat.unit,
                estimatedReturnDate: mat.estimatedReturnDate,
                statusHistory: [
                  { status: "dispatched", date: new Date().toISOString().split("T")[0], remarks: "Refreshed Challan Issued", qtyAffected: matState.refreshQty },
                  { status: "accepted", date: new Date().toISOString().split("T")[0], remarks: "Quantities validated for refresh", qtyAffected: matState.refreshQty }
                ],
                productionHistory: [
                  { stage: "queued", date: new Date().toISOString().split("T")[0], qtyProcessed: matState.refreshQty, batchNumber: "REF-" + nextNumber.split('/').pop(), qualityRemarks: "Refreshed document queue", expectedCompletionDate: mat.estimatedReturnDate, updatedAt: new Date().toISOString() }
                ],
                currentStatus: "at_jobworker",
                currentProductionStage: "queued",

                originalQtyInPrincipal: mat.originalQtyInPrincipal || mat.qtySent,
                qtyAtTimeOfRefresh: pendingBefore,
                refreshQty: matState.refreshQty,
                varianceFromPending: variance,
                varianceReason: formData.varianceReason,
                scrapLossQty: matState.scrap,
                scrapLossRemarks: formData.varianceReason
              });

              mat.qtyReturned += pendingBefore;
              mat.qtyInProcess = 0;
              mat.currentStatus = "refreshed";
              mat.currentProductionStage = null;
              mat.statusHistory.push({
                status: "refreshed",
                date: new Date().toISOString().split("T")[0],
                remarks: `Refreshed into new challan: ${nextNumber}`,
                qtyAffected: pendingBefore
              });
            }
          });

          const principalId = targetDn.principalChallanId || targetDn.id;
          const principalNumber = targetDn.principalChallanNumber || targetDn.dnNumber;
          
          const chain = targetDn.refreshHistory ? JSON.parse(JSON.stringify(targetDn.refreshHistory)) : [];
          chain.push({
            challanId: targetDn.id,
            challanNumber: targetDn.dnNumber,
            date: targetDn.dnDate
          });

          const newRefreshedDn = {
            dnNumber: nextNumber,
            dnDate: new Date().toISOString().split("T")[0],
            jobWorkerId: targetDn.jobWorkerId,
            jobWorkerName: targetDn.jobWorkerName,
            purpose: targetDn.purpose,
            materials: refreshedMaterials,
            transporterId: targetDn.transporterId,
            transporterName: targetDn.transporterName,
            vehicleNumber: formData.vehicle || null,
            driverName: targetDn.driverName,
            driverPhone: targetDn.driverPhone,
            lrNumber: formData.lr || null,
            dispatchDateTime: new Date().toISOString(),
            status: "at_jobworker",
            preparedBy: currentUser.fullName,
            remarks: formData.remarks,
            createdAt: new Date().toISOString(),

            principalChallanId: principalId,
            principalChallanNumber: principalNumber,
            isRefresh: true,
            refreshedFromId: targetDn.id,
            refreshedToId: null,
            refreshCount: targetDn.refreshCount + 1,
            refreshHistory: chain
          };

          const savedRef = db.deliveryNotes.save(newRefreshedDn);

          targetDn.status = "refreshed";
          targetDn.refreshedToId = savedRef.id;
          db.deliveryNotes.save(targetDn);

          showToast(`Refreshed Challan ${nextNumber} generated successfully!`, "success");
          closeModal();
        };

        return (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Current Challan Details</label>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  <div>Challan No: <strong>{dn.dnNumber}</strong></div>
                  <div>Principal: <strong>{dn.isRefresh ? dn.principalChallanNumber : dn.dnNumber}</strong></div>
                  <div>Job Worker: <strong>{dn.jobWorkerName}</strong></div>
                </div>
              </div>
              <div className="form-group">
                <label>Refreshed Challan Details</label>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  <div>New Challan No: <strong>{nextNumber}</strong></div>
                  <div>Date: <strong>{formatDate(new Date())}</strong></div>
                  <div>Status: <strong>Refreshed Dispatch</strong></div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Quantity Reconciliation & Editing</label>
              <table className="table-premium" style={{ background: 'rgba(0,0,0,0.15)', marginBottom: '12px', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Challan Qty</th>
                    <th>Returned Qty</th>
                    <th>Scrap / Loss *</th>
                    <th>Pending Qty</th>
                    <th>Refresh Qty *</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => (
                    <tr key={m.id}>
                      <td><strong>{m.description}</strong></td>
                      <td>{m.qtySent} {m.unit}</td>
                      <td>{m.qtyReturned}</td>
                      <td>
                        <input type="number" className="form-control" style={{ maxWidth: '80px', padding: '6px' }} value={m.scrap} onChange={e => updateMaterial(idx, 'scrap', e.target.value)} min="0" max={m.origPending} required />
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{m.pending}</td>
                      <td>
                        <input type="number" className="form-control" style={{ maxWidth: '80px', padding: '6px' }} value={m.refreshQty} onChange={e => updateMaterial(idx, 'refreshQty', e.target.value)} min="1" max={m.pending} required />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasVariance && (
              <div className="form-group">
                <label style={{ color: 'var(--warning)' }}>⚠ Mandatory Reason for Quantity Variance *</label>
                <input type="text" className="form-control" placeholder="Describe scrap loss, processing shrinkage, or discrepancy..." value={formData.varianceReason} onChange={e => setFormData({...formData, varianceReason: e.target.value})} required />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Transport Vehicle No</label>
                <input type="text" className="form-control" value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} placeholder="Vehicle Number" />
              </div>
              <div className="form-group">
                <label>LR / GR Number</label>
                <input type="text" className="form-control" value={formData.lr} onChange={e => setFormData({...formData, lr: e.target.value})} placeholder="Lorry Receipt Number" />
              </div>
            </div>

            <div className="form-group">
              <label>Refresh Remarks</label>
              <input type="text" className="form-control" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Refreshed Challan</button>
            </div>
          </form>
        );
      };

      openModal(`🔄 Process 120-Day Challan Refresh`, <FormContent />);
    };

    return (
      <div className={`tab-content ${activeTab === 'refresh' ? 'active' : ''}`}>
        <div className="alert-card alert-card-info" style={{ marginBottom: '24px' }}>
          <div>
            <div className="alert-title">Document Validity Cycle: 120 Days</div>
            <div className="alert-sub">To remain compliant with statutory rules, delivery challan documents must be renewed/refreshed every 120 days. Use the quick-actions below to re-issue refreshed challans linked to their principals.</div>
          </div>
        </div>

        <h3 style={{ marginBottom: '16px' }}>Active Challans Nearing 120-Day Limit (Due in &le; 15 days)</h3>
        
        <div className="card glass table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Current Challan No.</th>
                <th>Challan Date</th>
                <th>Job Worker</th>
                <th>Principal Challan</th>
                <th>Document Age</th>
                <th>Days to Limit</th>
                <th>Refreshes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {refreshDue.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>All active documents are healthy. No refreshes required.</td></tr>
              ) : (
                refreshDue.map(d => {
                  const docAge = daysBetween(d.dnDate);
                  const daysToLimit = 120 - docAge;
                  const principal = d.isRefresh ? d.principalChallanNumber : d.dnNumber;

                  return (
                    <tr key={d.id}>
                      <td><strong>{d.dnNumber}</strong></td>
                      <td><code>{formatDate(d.dnDate)}</code></td>
                      <td><strong>{d.jobWorkerName}</strong></td>
                      <td><code>{principal}</code></td>
                      <td>{docAge} Days</td>
                      <td style={{ fontWeight: 600, color: daysToLimit <= 3 ? 'var(--danger)' : 'var(--warning)' }}>
                        {daysToLimit <= 0 ? 'OVERDUE' : `${daysToLimit} Days`}
                      </td>
                      <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>{d.refreshCount} Refreshes</span></td>
                      <td>
                        <button className="btn btn-primary" onClick={() => triggerRefreshForm(d.id)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                          🔄 Refresh Challan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------------
  // Tab 4: GST Compliance
  // --------------------------------------------------------------------------------
  const GstTab = () => {
    const inputs = [];
    const capGoods = [];

    activeDns.forEach(dn => {
      const principalDate = dn.isRefresh ? dn.refreshHistory[0].date : dn.dnDate;
      const materialAge = daysBetween(principalDate);

      dn.materials.forEach(m => {
        const pending = m.qtySent - m.qtyReturned;
        if (pending > 0) {
          const record = {
            id: m.id,
            dnNumber: dn.dnNumber,
            principalChallan: dn.isRefresh ? dn.principalChallanNumber : dn.dnNumber,
            principalDate: principalDate,
            jobWorkerName: dn.jobWorkerName,
            description: m.description,
            pending: pending,
            unit: m.unit,
            age: materialAge
          };

          const isCapital = m.description.toLowerCase().includes("block") || m.description.toLowerCase().includes("fixture") || m.description.toLowerCase().includes("die");
          
          if (isCapital) {
            capGoods.push(record);
          } else {
            inputs.push(record);
          }
        }
      });
    });

    const GstList = ({ records, limit }) => {
      if (records.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active items under this category.</div>;
      }

      return records.map(rec => {
        const remaining = limit - rec.age;
        const isCritical = remaining <= 30;
        
        return (
          <div key={rec.id} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-glass)', lineHeight: '1.5', borderLeft: `4px solid ${isCritical ? 'var(--danger)' : 'var(--warning)'}`, background: isCritical ? 'rgba(239,68,68,0.05)' : 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>{rec.description} ({rec.pending} {rec.unit})</span>
              <span style={{ color: isCritical ? 'var(--danger)' : 'var(--text-primary)' }}>{rec.age} Days Old</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Job Worker: <strong>{rec.jobWorkerName}</strong><br />
              Principal DN: <strong>{rec.principalChallan}</strong> ({formatDate(rec.principalDate)})<br />
              Due limit: <strong style={{ color: isCritical ? 'var(--danger)' : 'var(--success)' }}>{remaining > 0 ? `${remaining} days remaining` : 'OVERDUE (Taxable)'}</strong>
            </div>
          </div>
        );
      });
    };

    return (
      <div className={`tab-content ${activeTab === 'gst' ? 'active' : ''}`}>
        <div className="compliance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--warning)' }}>💼 GST Section 143: Inputs (1-Year Threshold)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Materials must be received back within 365 days of dispatch, else taxed as sales.</p>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <GstList records={inputs} limit={365} />
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <h3 style={{ color: '#a78bfa' }}>🔩 GST Section 143: Capital Goods (3-Year Threshold)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Tools, dies, fixtures, or machinery must return within 3 years (1095 days).</p>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <GstList records={capGoods} limit={1095} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="tabs-container">
        <div className="tabs-nav">
          <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📊 Aging Summary</button>
          <button className={`tab-btn ${activeTab === 'nonmoving' ? 'active' : ''}`} onClick={() => setActiveTab('nonmoving')}>🔄 Non-Moving Analysis (Principal)</button>
          <button className={`tab-btn ${activeTab === 'refresh' ? 'active' : ''}`} onClick={() => setActiveTab('refresh')}>📋 Challan Refresh (120-Day)</button>
          <button className={`tab-btn ${activeTab === 'gst' ? 'active' : ''}`} onClick={() => setActiveTab('gst')}>⚖️ GST Compliance Alerts</button>
        </div>
        
        <SummaryTab />
        <NonMovingTab />
        <RefreshTab />
        <GstTab />
      </div>
    </>
  );
}
