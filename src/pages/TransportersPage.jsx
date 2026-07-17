// src/pages/TransportersPage.jsx
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useModal } from '../components/Modal';

export default function TransportersPage() {
  const { db, refresh } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const [search, setSearch] = useState('');
  const canEdit = ["admin", "store_manager"].includes(currentUser.role);

  const allTransporters = db.transporters.getAll();
  const filtered = allTransporters.filter(t => {
    const matchesCompany = t.companyName.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase());
    const matchesDriver = t.vehicles.some(v => v.driverName.toLowerCase().includes(search.toLowerCase()) || v.vehicleNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesCompany || matchesDriver;
  });

  const vehicleTypes = ["Tata Ace (Tempo)", "Eicher Pro (14ft)", "Taurus 10-Wheeler", "Mahindra Bolero Pickup", "32 Ft Container", "Other"];

  const openTransporterForm = (transporterId = null) => {
    const isEdit = transporterId !== null;
    let t = isEdit ? db.transporters.getById(transporterId) : { companyName: "", contactPerson: "", phone: "", email: "", address: "", vehicles: [], status: "active" };

    const FormContent = () => {
      const [companyName, setCompanyName] = useState(t.companyName);
      const [contactPerson, setContactPerson] = useState(t.contactPerson);
      const [phone, setPhone] = useState(t.phone);
      const [email, setEmail] = useState(t.email);
      const [address, setAddress] = useState(t.address || '');
      const [vehicles, setVehicles] = useState(t.vehicles.length > 0 ? [...t.vehicles] : [{ vehicleNumber: "", vehicleType: "Tata Ace (Tempo)", driverName: "", driverPhone: "" }]);
      const [status, setStatus] = useState(t.status);

      const updateVehicle = (idx, field, value) => {
        const updated = [...vehicles];
        updated[idx] = { ...updated[idx], [field]: value };
        setVehicles(updated);
      };

      const addVehicle = () => setVehicles([...vehicles, { vehicleNumber: "", vehicleType: "Tata Ace (Tempo)", driverName: "", driverPhone: "" }]);
      const removeVehicle = (idx) => {
        if (vehicles.length <= 1) { showToast("A transporter must have at least one registered vehicle", "warning"); return; }
        setVehicles(vehicles.filter((_, i) => i !== idx));
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        const validVehicles = vehicles.filter(v => v.vehicleNumber.trim() && v.driverName.trim() && v.driverPhone.trim())
          .map(v => ({ ...v, vehicleNumber: v.vehicleNumber.trim().toUpperCase() }));
        if (validVehicles.length === 0) { showToast("Please register at least one driver/vehicle under this transporter", "error"); return; }
        const updatedTransporter = { id: transporterId || undefined, code: isEdit ? t.code : undefined, companyName: companyName.trim(), contactPerson: contactPerson.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), vehicles: validVehicles, status };
        if (db.transporters.save(updatedTransporter)) { showToast(isEdit ? "Transporter profile updated" : "Transporter registered successfully", "success"); closeModal(); refresh(); }
        else showToast("Failed to save transporter details", "error");
      };

      return (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Transport Company Name *</label><input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} required /></div>
            <div className="form-group"><label>Contact Person *</label><input type="text" className="form-control" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone Number *</label><input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
            <div className="form-group"><label>Email Address *</label><input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          </div>
          <div className="form-group"><label>Address</label><input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ marginBottom: 0 }}>Registered Fleet Vehicles</label>
              <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={addVehicle}>➕ Add Vehicle Row</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vehicles.map((v, idx) => (
                <div key={idx} className="form-row" style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', alignItems: 'center' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}><input type="text" className="form-control" value={v.vehicleNumber} onChange={e => updateVehicle(idx, 'vehicleNumber', e.target.value)} placeholder="Veh. No." required /></div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}><select className="form-control" value={v.vehicleType} onChange={e => updateVehicle(idx, 'vehicleType', e.target.value)} required>{vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}</select></div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}><input type="text" className="form-control" value={v.driverName} onChange={e => updateVehicle(idx, 'driverName', e.target.value)} placeholder="Driver Name" required /></div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}><input type="text" className="form-control" value={v.driverPhone} onChange={e => updateVehicle(idx, 'driverPhone', e.target.value)} placeholder="Driver Phone" required /></div>
                  <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '8px 10px', color: 'var(--danger)', borderColor: 'transparent', background: 'transparent' }} onClick={() => removeVehicle(idx)}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group"><label>Status *</label><select className="form-control" value={status} onChange={e => setStatus(e.target.value)} required><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Transporter</button>
          </div>
        </form>
      );
    };
    openModal(isEdit ? "✏️ Edit Transporter Record" : "🚛 Register New Transporter Company", <FormContent />);
  };

  return (
    <>
      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '300px' }}><input type="text" className="form-control" placeholder="Search by company or driver..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {canEdit && <button className="btn btn-primary" onClick={() => openTransporterForm()}>➕ Add Transporter</button>}
      </div>
      <div className="card glass table-responsive">
        <table className="table-premium">
          <thead><tr><th>Code</th><th>Company Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Registered Vehicles</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No transporters registered</td></tr> :
            filtered.map(t => (
              <tr key={t.id} valign="top">
                <td><code>{t.code}</code></td>
                <td><strong>{t.companyName}</strong></td>
                <td>{t.contactPerson}</td>
                <td>{t.phone}</td>
                <td>{t.email}</td>
                <td><div>{t.vehicles.length > 0 ? t.vehicles.map((v, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '4px 8px', marginBottom: '4px', borderRadius: '4px' }}>
                    <strong>{v.vehicleNumber}</strong> ({v.vehicleType})<br/><span style={{ color: 'var(--text-secondary)' }}>Driver: {v.driverName} ({v.driverPhone})</span>
                  </div>
                )) : <span style={{ color: 'var(--text-muted)' }}>No vehicles linked</span>}</div></td>
                <td><span className="badge" style={t.status === 'active' ? {background:'rgba(16,185,129,0.15)',color:'#34d399'} : {background:'rgba(239,68,68,0.15)',color:'#f87171'}}>{t.status}</span></td>
                {canEdit && <td><button className="btn btn-secondary btn-icon" onClick={() => openTransporterForm(t.id)}>✏️</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
