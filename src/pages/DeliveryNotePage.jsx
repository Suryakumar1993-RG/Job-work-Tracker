import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { daysBetween, getAgeColor, getStatusColor, formatDate, getStageColor } from '../utils/helpers';

export default function DeliveryNotePage() {
  const { db } = useData();
  const { currentUser } = useAuth();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const canCreate = ["admin", "store_manager", "store_operator"].includes(currentUser.role);
  const allDns = db.deliveryNotes.getAll();

  const filteredDns = useMemo(() => {
    return allDns.filter(d => {
      const q = searchQuery.toLowerCase();
      const matchesQ = d.dnNumber.toLowerCase().includes(q) || d.jobWorkerName.toLowerCase().includes(q) || d.purpose.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || d.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [allDns, searchQuery, statusFilter]);

  const dispatchChallan = (id) => {
    const dn = db.deliveryNotes.getById(id);
    if (!dn) return;

    dn.status = "in_transit";
    dn.materials.forEach(m => {
      m.currentStatus = "in_transit";
      m.statusHistory.push({
        status: "in_transit",
        date: new Date().toISOString().split("T")[0],
        remarks: "Outward Material Dispatched in Transit",
        qtyAffected: m.qtySent
      });
    });

    db.deliveryNotes.save(dn);
    showToast(`${dn.dnNumber} dispatched successfully!`, "success");
    closeModal();
  };

  const handleOpenDnForm = (dnId = null) => {
    const isEdit = dnId !== null;
    let initialDn = { dnNumber: "", dnDate: new Date().toISOString().split("T")[0], jobWorkerId: "", purpose: "", materials: [], transporterId: "", vehicleNumber: "", driverName: "", driverPhone: "", lrNumber: "", remarks: "" };
    
    if (isEdit) {
      initialDn = db.deliveryNotes.getById(dnId);
    } else {
      initialDn.dnNumber = db.deliveryNotes.getNextNumber();
      // Ensure at least one material row for new form
      initialDn.materials = [{ description: "", hsnCode: "", qtySent: "", unit: "Pcs", estimatedReturnDate: "" }];
    }

    const workers = db.jobWorkers.getAll().filter(w => w.status === "active");
    const transporters = db.transporters.getAll().filter(t => t.status === "active");

    const FormContent = () => {
      const [formData, setFormData] = useState(initialDn);

      const handleAddMaterial = () => {
        setFormData(prev => ({
          ...prev,
          materials: [...prev.materials, { description: "", hsnCode: "", qtySent: "", unit: "Pcs", estimatedReturnDate: "" }]
        }));
      };

      const handleRemoveMaterial = (index) => {
        if (formData.materials.length > 1) {
          setFormData(prev => ({
            ...prev,
            materials: prev.materials.filter((_, i) => i !== index)
          }));
        } else {
          showToast("A delivery note must contain at least one material", "warning");
        }
      };

      const handleMaterialChange = (index, field, value) => {
        const newMaterials = [...formData.materials];
        newMaterials[index][field] = value;
        setFormData(prev => ({ ...prev, materials: newMaterials }));
      };

      const handleTransporterChange = (e) => {
        const transId = e.target.value;
        setFormData(prev => ({ ...prev, transporterId: transId, vehicleNumber: "", driverName: "", driverPhone: "" }));
      };

      const handleVehicleChange = (e) => {
        const vehNo = e.target.value;
        const trans = transporters.find(t => t.id === formData.transporterId);
        const veh = trans?.vehicles.find(v => v.vehicleNumber === vehNo);
        
        setFormData(prev => ({
          ...prev,
          vehicleNumber: vehNo,
          driverName: veh ? veh.driverName : "",
          driverPhone: veh ? veh.driverPhone : ""
        }));
      };

      const handleSubmit = (e, isDispatch) => {
        e.preventDefault();
        const worker = db.jobWorkers.getById(formData.jobWorkerId);
        
        const validMaterials = formData.materials.filter(m => m.description && m.hsnCode && m.qtySent && m.estimatedReturnDate);
        if (validMaterials.length === 0) {
          showToast("Please enter at least one valid material line item", "error");
          return;
        }

        const mappedMaterials = validMaterials.map(m => ({
          id: m.id || "mat_" + Math.random().toString(36).substr(2, 5),
          description: m.description,
          hsnCode: m.hsnCode,
          qtySent: parseFloat(m.qtySent),
          qtyReturned: m.qtyReturned || 0,
          qtyInProcess: m.qtyInProcess || 0,
          qtyCompleted: m.qtyCompleted || 0,
          qtyAcceptedByVendor: m.qtyAcceptedByVendor || 0,
          qtyShortage: m.qtyShortage || 0,
          unit: m.unit,
          estimatedReturnDate: m.estimatedReturnDate,
          statusHistory: isDispatch ? [
            ...(m.statusHistory || []),
            { status: "dispatched", date: new Date().toISOString().split("T")[0], remarks: "Outward Material Dispatched", qtyAffected: parseFloat(m.qtySent) }
          ] : (m.statusHistory || []),
          productionHistory: m.productionHistory || [],
          currentStatus: isDispatch ? "in_transit" : "draft",
          currentProductionStage: m.currentProductionStage || null
        }));

        const selectedTrans = transporters.find(t => t.id === formData.transporterId);

        const newDn = {
          ...formData,
          id: isEdit ? formData.id : undefined,
          jobWorkerName: worker?.companyName,
          materials: mappedMaterials,
          transporterName: selectedTrans ? selectedTrans.companyName : null,
          dispatchDateTime: isDispatch ? new Date().toISOString().split("T")[0] + "T12:00" : (isEdit ? formData.dispatchDateTime : null),
          status: isDispatch ? "in_transit" : "draft",
          preparedBy: currentUser.fullName,
          createdAt: isEdit ? formData.createdAt : new Date().toISOString(),
          principalChallanId: isEdit ? formData.principalChallanId : null,
          principalChallanNumber: isEdit ? formData.principalChallanNumber : null,
          isRefresh: isEdit ? formData.isRefresh : false,
          refreshedFromId: isEdit ? formData.refreshedFromId : null,
          refreshedToId: isEdit ? formData.refreshedToId : null,
          refreshCount: isEdit ? formData.refreshCount : 0,
          refreshHistory: isEdit ? formData.refreshHistory : []
        };

        if (db.deliveryNotes.save(newDn)) {
          showToast(isDispatch ? "Delivery note dispatched successfully!" : "Delivery note saved as draft", "success");
          closeModal();
        } else {
          showToast("Failed to save delivery note", "error");
        }
      };

      const selectedTrans = transporters.find(t => t.id === formData.transporterId);

      return (
        <form>
          <div className="form-row">
            <div className="form-group">
              <label>DN Number *</label>
              <input type="text" className="form-control" value={formData.dnNumber} onChange={e => setFormData({...formData, dnNumber: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>DN Date *</label>
              <input type="date" className="form-control" value={formData.dnDate} onChange={e => setFormData({...formData, dnDate: e.target.value})} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Job Worker *</label>
              <select className="form-control" value={formData.jobWorkerId} onChange={e => setFormData({...formData, jobWorkerId: e.target.value})} required>
                <option value="">-- Select Job Worker --</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.code} - {w.companyName} ({w.address.city})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Purpose of Job Work *</label>
              <input type="text" className="form-control" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="e.g. Machining, Hardening" required />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '20px', paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Material Line Items</label>
              <button type="button" className="btn btn-secondary btn-icon" onClick={handleAddMaterial} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>➕ Add Material Row</button>
            </div>
            <div className="table-responsive">
              <table className="material-form-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Description *</th>
                    <th style={{ width: '15%' }}>HSN Code *</th>
                    <th style={{ width: '12%' }}>Qty Sent *</th>
                    <th style={{ width: '13%' }}>Unit *</th>
                    <th style={{ width: '15%' }}>Est. Return Date *</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.materials.map((m, idx) => (
                    <tr key={idx} className="mat-row-item">
                      <td><input type="text" className="form-control" value={m.description} onChange={e => handleMaterialChange(idx, 'description', e.target.value)} placeholder="Description" required /></td>
                      <td><input type="text" className="form-control" value={m.hsnCode} onChange={e => handleMaterialChange(idx, 'hsnCode', e.target.value)} placeholder="HSN" required /></td>
                      <td><input type="number" className="form-control" value={m.qtySent} onChange={e => handleMaterialChange(idx, 'qtySent', e.target.value)} placeholder="Qty" min="1" required /></td>
                      <td>
                        <select className="form-control" value={m.unit} onChange={e => handleMaterialChange(idx, 'unit', e.target.value)} required>
                          {["Pcs", "Kg", "Mtrs", "Ltrs", "Nos", "Sets"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td><input type="date" className="form-control" value={m.estimatedReturnDate} onChange={e => handleMaterialChange(idx, 'estimatedReturnDate', e.target.value)} required /></td>
                      <td><button type="button" className="btn btn-secondary btn-icon" onClick={() => handleRemoveMaterial(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)' }} title="Delete Material">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '10px', paddingTop: '14px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>🚚 Transport & Vehicle Allocation</label>
            <div className="form-row">
              <div className="form-group">
                <label>Transporter</label>
                <select className="form-control" value={formData.transporterId} onChange={handleTransporterChange}>
                  <option value="">-- Select Transporter --</option>
                  {transporters.map(t => <option key={t.id} value={t.id}>{t.code} - {t.companyName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle Allocation</label>
                <select className="form-control" value={formData.vehicleNumber} onChange={handleVehicleChange}>
                  <option value="">-- Select Vehicle --</option>
                  {selectedTrans?.vehicles?.map(v => <option key={v.vehicleNumber} value={v.vehicleNumber}>{v.vehicleNumber} ({v.vehicleType})</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Driver Name</label>
                <input type="text" className="form-control" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Driver Phone</label>
                <input type="text" className="form-control" value={formData.driverPhone} onChange={e => setFormData({...formData, driverPhone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>LR / GR Number</label>
                <input type="text" className="form-control" value={formData.lrNumber} onChange={e => setFormData({...formData, lrNumber: e.target.value})} placeholder="Lorry Receipt No." />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>General Remarks</label>
            <input type="text" className="form-control" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn btn-secondary" onClick={(e) => handleSubmit(e, false)} style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>💾 Save as Draft</button>
            <button type="button" className="btn btn-primary" onClick={(e) => handleSubmit(e, true)}>🚀 Save & Dispatch</button>
          </div>
        </form>
      );
    };

    openModal(isEdit ? `✏️ Edit Outward Delivery Note - ${initialDn.dnNumber}` : "📝 Create Outward Job Work Challan", <FormContent />);
  };

  const handleViewDetails = (dn) => {
    const qtySent = dn.materials.reduce((sum, m) => sum + m.qtySent, 0);
    const qtyReturned = dn.materials.reduce((sum, m) => sum + m.qtyReturned, 0);

    let chainHtml = null;
    if (dn.isRefresh || dn.refreshedToId) {
      const fullChain = [];
      let node = dn;
      if (dn.isRefresh) {
        const principal = allDns.find(d => d.id === dn.principalChallanId);
        if (principal) fullChain.push(principal);
        dn.refreshHistory.forEach(hist => {
          const refDn = allDns.find(d => d.id === hist.challanId);
          if (refDn && refDn.id !== dn.id && refDn.id !== (principal?.id || '')) fullChain.push(refDn);
        });
      }
      fullChain.push(dn);
      let currentChildId = dn.refreshedToId;
      while (currentChildId) {
        const childDn = allDns.find(d => d.id === currentChildId);
        if (childDn) {
          fullChain.push(childDn);
          currentChildId = childDn.refreshedToId;
        } else break;
      }

      chainHtml = (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>120-Day Document History Chain</h4>
          <div className="chain-wrapper">
            {fullChain.map((nodeDn, idx) => (
              <div key={nodeDn.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`chain-node ${nodeDn.id === dn.id ? 'active' : ''}`}>
                  <strong>{nodeDn.dnNumber}</strong><br />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{formatDate(nodeDn.dnDate)} ({daysBetween(nodeDn.dnDate)}d ago)</span>
                </div>
                {idx < fullChain.length - 1 && <span className="chain-arrow">➡</span>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const ModalContent = () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {chainHtml}
        <div className="grid-details" style={{ display: 'flex', gap: '15px' }}>
          <div className="detail-block">
            <h4>Delivery Note No.</h4>
            <p>{dn.dnNumber}</p>
          </div>
          <div className="detail-block">
            <h4>Challan Date</h4>
            <p>{formatDate(dn.dnDate)}</p>
          </div>
          <div className="detail-block">
            <h4>Job Worker</h4>
            <p>{dn.jobWorkerName}</p>
          </div>
          <div className="detail-block">
            <h4>Current Status</h4>
            <p><span className="badge" style={{ background: getStatusColor(dn.status).bg, color: getStatusColor(dn.status).text }}>{dn.status.replace("_", " ")}</span></p>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Material Line Items</h4>
          <table className="table-premium" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>HSN Code</th>
                <th>Sent Qty</th>
                <th>Returned Qty</th>
                <th>Pending</th>
                <th>Est. Return Date</th>
                <th>Production Stage</th>
              </tr>
            </thead>
            <tbody>
              {dn.materials.map((m, i) => (
                <tr key={i}>
                  <td><strong>{m.description}</strong></td>
                  <td><code>{m.hsnCode}</code></td>
                  <td>{m.qtySent} {m.unit}</td>
                  <td>{m.qtyReturned} {m.unit}</td>
                  <td style={{ fontWeight: 600, color: m.qtySent - m.qtyReturned > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{m.qtySent - m.qtyReturned}</td>
                  <td>{formatDate(m.estimatedReturnDate)}</td>
                  <td><span className="badge" style={{ background: getStageColor(m.currentProductionStage).bg, color: getStageColor(m.currentProductionStage).text, border: `1px solid ${getStageColor(m.currentProductionStage).border}44` }}>{m.currentProductionStage || "N/A"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid-2">
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>🚚 Transport & Vehicle Details</h4>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              <div>Transporter: <strong>{dn.transporterName || "N/A"}</strong></div>
              <div>Vehicle No: <strong>{dn.vehicleNumber || "N/A"}</strong></div>
              <div>Driver: <strong>{dn.driverName || "N/A"} ({dn.driverPhone || "N/A"})</strong></div>
              <div>LR/GR Number: <strong>{dn.lrNumber || "N/A"}</strong></div>
              <div>Dispatch Time: <strong>{dn.dispatchDateTime ? dn.dispatchDateTime.replace("T", " ") : "N/A"}</strong></div>
            </div>
          </div>
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>📋 Remarks & System Logs</h4>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              <div>Remarks: <i>"{dn.remarks || 'No remarks'}"</i></div>
              <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Created At: {new Date(dn.createdAt).toLocaleString()}<br />
                Prepared By: {dn.preparedBy}
              </div>
            </div>
          </div>
        </div>

        <div className="card glass" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>🔄 Dispatch & Receipt Traceability Timeline</h4>
          <div className="timeline-list">
            {dn.materials[0]?.statusHistory?.map((h, i) => (
              <div key={i} className="timeline-event">
                <div className="timeline-event-header">
                  <strong>{h.status.replace("_", " ").toUpperCase()}</strong>
                  <span>{formatDate(h.date)}</span>
                </div>
                <div className="timeline-event-content">{h.remarks} (Quantity: {h.qtyAffected})</div>
              </div>
            )) || <p style={{ color: 'var(--text-muted)' }}>No timeline records</p>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
          {dn.status === 'draft' && <button className="btn btn-success" onClick={() => dispatchChallan(dn.id)}>🚀 Dispatch Material</button>}
          {dn.status === 'in_transit' && (currentUser.role === 'job_worker' || currentUser.role === 'admin') && <button className="btn btn-primary" onClick={() => { window.location.href='/app/acceptance'; closeModal(); }}>✅ Acknowledge Receipt</button>}
          <button className="btn btn-secondary" onClick={closeModal}>Close Window</button>
        </div>
      </div>
    );

    openModal(`📦 Delivery Note Detail - ${dn.dnNumber}`, <ModalContent />);
  };

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1>Delivery Notes / Outward Challan</h1>
          <p>Manage raw material outward shipments</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '250px' }}>
          <input type="text" className="form-control" placeholder="Search DN No. or Job Worker..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="form-group" style={{ maxWidth: '180px' }}>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_transit">In Transit</option>
            <option value="at_jobworker">At JobWorker</option>
            <option value="in_production">In Production</option>
            <option value="partial_return">Partial Return</option>
            <option value="fully_returned">Fully Returned</option>
            <option value="refreshed">Refreshed (Replaced)</option>
          </select>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => handleOpenDnForm()}>📝 Create Outward DN</button>
        )}
      </div>

      <div className="card glass table-responsive">
        <table className="table-premium">
          <thead>
            <tr>
              <th>DN Number</th>
              <th>Date</th>
              <th>Job Worker</th>
              <th>Purpose</th>
              <th>Material Qty</th>
              <th>Pending</th>
              <th>Doc Age</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDns.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No delivery notes found</td></tr>
            ) : (
              filteredDns.map(d => {
                const qtySent = d.materials.reduce((sum, m) => sum + m.qtySent, 0);
                const qtyReturned = d.materials.reduce((sum, m) => sum + m.qtyReturned, 0);
                const pending = qtySent - qtyReturned;
                const docAge = daysBetween(d.dnDate);
                const ageStyle = getAgeColor(docAge);
                const statusStyle = getStatusColor(d.status);

                return (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.dnNumber}</strong>
                      {d.isRefresh && <><br /><span style={{ fontSize: '0.7rem', color: 'var(--info)' }}>🔄 Refreshed principal: {d.principalChallanNumber}</span></>}
                    </td>
                    <td><code>{formatDate(d.dnDate)}</code></td>
                    <td><strong>{d.jobWorkerName}</strong></td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.purpose}</td>
                    <td>{qtySent} {d.materials[0]?.unit || ''}</td>
                    <td style={{ fontWeight: 600, color: pending > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{pending}</td>
                    <td>
                      <span className="badge" style={{ background: ageStyle.bg, color: ageStyle.text, border: `1px solid ${ageStyle.text}22` }}>
                        {docAge} Days
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}>
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-icon" onClick={() => handleViewDetails(d)} title="View Details">👁️</button>
                      {d.status === 'draft' && (
                        <button className="btn btn-secondary btn-icon" onClick={() => handleOpenDnForm(d.id)} title="Edit Draft" style={{ marginLeft: '5px' }}>✏️</button>
                      )}
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
