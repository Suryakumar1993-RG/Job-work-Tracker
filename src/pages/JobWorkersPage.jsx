// src/pages/JobWorkersPage.jsx
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useModal } from '../components/Modal';

export default function JobWorkersPage() {
  const { db, refresh } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const [search, setSearch] = useState('');
  const canEdit = ["admin", "store_manager"].includes(currentUser.role);

  const allWorkers = db.jobWorkers.getAll();
  const filtered = allWorkers.filter(w => w.companyName.toLowerCase().includes(search.toLowerCase()) || w.code.toLowerCase().includes(search.toLowerCase()) || w.gstin.toLowerCase().includes(search.toLowerCase()) || w.contactPerson.toLowerCase().includes(search.toLowerCase()));

  const openWorkerForm = (workerId = null) => {
    const isEdit = workerId !== null;
    let w = isEdit ? db.jobWorkers.getById(workerId) : { companyName: "", gstin: "", contactPerson: "", phone: "", email: "", address: { line1: "", line2: "", city: "", state: "", pinCode: "" }, capabilities: [], status: "active", remarks: "" };
    const commonCaps = ["Machining", "Drilling", "Lathe Turning", "Heat Treatment", "Annealing", "Tempering", "Powder Coating", "Painting", "Anodizing", "Welding", "Bending", "Assembly"];

    const FormContent = () => {
      const [companyName, setCompanyName] = useState(w.companyName);
      const [gstin, setGstin] = useState(w.gstin);
      const [contactPerson, setContactPerson] = useState(w.contactPerson);
      const [phone, setPhone] = useState(w.phone);
      const [email, setEmail] = useState(w.email);
      const [addr1, setAddr1] = useState(w.address.line1);
      const [addr2, setAddr2] = useState(w.address.line2);
      const [city, setCity] = useState(w.address.city);
      const [state, setState] = useState(w.address.state);
      const [pin, setPin] = useState(w.address.pinCode);
      const [caps, setCaps] = useState([...w.capabilities]);
      const [status, setStatus] = useState(w.status);
      const [remarks, setRemarks] = useState(w.remarks || '');

      const toggleCap = (cap) => setCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);

      const handleSubmit = (e) => {
        e.preventDefault();
        const updatedWorker = { id: workerId || undefined, code: isEdit ? w.code : undefined, companyName: companyName.trim(), gstin: gstin.trim().toUpperCase(), contactPerson: contactPerson.trim(), phone: phone.trim(), email: email.trim(), address: { line1: addr1.trim(), line2: addr2.trim(), city: city.trim(), state: state.trim(), pinCode: pin.trim() }, capabilities: caps, status, remarks: remarks.trim() };
        if (db.jobWorkers.save(updatedWorker)) { showToast(isEdit ? "Job worker profile updated" : "New job worker profile registered", "success"); closeModal(); refresh(); }
        else showToast("Failed to save job worker details", "error");
      };

      return (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Company Name *</label><input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} required /></div>
            <div className="form-group"><label>GSTIN *</label><input type="text" className="form-control" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="e.g. 27AAAAA1111A1Z1" required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Contact Person *</label><input type="text" className="form-control" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required /></div>
            <div className="form-group"><label>Phone Number *</label><input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
          </div>
          <div className="form-group"><label>Email Address *</label><input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="form-group">
            <label>Physical Address Details *</label>
            <input type="text" className="form-control" value={addr1} onChange={e => setAddr1(e.target.value)} placeholder="Line 1 (Plot No., Street)" style={{ marginBottom: '8px' }} required />
            <input type="text" className="form-control" value={addr2} onChange={e => setAddr2(e.target.value)} placeholder="Line 2 (Area, Landmark)" style={{ marginBottom: '8px' }} />
            <div className="form-row">
              <div className="form-group"><input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} placeholder="City" required /></div>
              <div className="form-group"><input type="text" className="form-control" value={state} onChange={e => setState(e.target.value)} placeholder="State" required /></div>
              <div className="form-group"><input type="text" className="form-control" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN Code" required /></div>
            </div>
          </div>
          <div className="form-group">
            <label>Process Capabilities</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              {commonCaps.map(cap => (
                <label key={cap} className="form-check"><input type="checkbox" checked={caps.includes(cap)} onChange={() => toggleCap(cap)} /><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cap}</span></label>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Status *</label><select className="form-control" value={status} onChange={e => setStatus(e.target.value)} required><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="form-group"><label>Remarks</label><input type="text" className="form-control" value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Job Worker</button>
          </div>
        </form>
      );
    };
    openModal(isEdit ? "✏️ Edit Job Worker Master Record" : "🏭 Register New Job Worker Profile", <FormContent />);
  };

  return (
    <>
      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '300px' }}><input type="text" className="form-control" placeholder="Search by name, code or GSTIN..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {canEdit && <button className="btn btn-primary" onClick={() => openWorkerForm()}>➕ Add Job Worker</button>}
      </div>
      <div className="card glass table-responsive">
        <table className="table-premium">
          <thead><tr><th>Code</th><th>Company Name</th><th>GSTIN</th><th>Contact Person</th><th>Phone</th><th>City & State</th><th>Capabilities</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={canEdit ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No job workers registered</td></tr> :
            filtered.map(w => (
              <tr key={w.id}>
                <td><code>{w.code}</code></td>
                <td><strong>{w.companyName}</strong></td>
                <td><code>{w.gstin}</code></td>
                <td>{w.contactPerson}</td>
                <td>{w.phone}</td>
                <td>{w.address.city}, {w.address.state}</td>
                <td><div style={{ display: 'flex', flexWrap: 'wrap' }}>{w.capabilities.map(cap => <span key={cap} className="badge" style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', marginRight: '4px', marginBottom: '4px', fontWeight: 500 }}>{cap}</span>)}</div></td>
                <td><span className="badge" style={w.status === 'active' ? {background:'rgba(16,185,129,0.15)',color:'#34d399'} : {background:'rgba(239,68,68,0.15)',color:'#f87171'}}>{w.status}</span></td>
                {canEdit && <td><button className="btn btn-secondary btn-icon" onClick={() => openWorkerForm(w.id)}>✏️</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
