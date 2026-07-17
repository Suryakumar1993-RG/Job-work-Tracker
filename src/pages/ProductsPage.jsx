// src/pages/ProductsPage.jsx
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useModal } from '../components/Modal';

export default function ProductsPage() {
  const { db, refresh } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const canEdit = ["admin", "store_manager"].includes(currentUser.role);

  const allPrds = db.products.getAll();
  const filtered = allPrds.filter(p => {
    const matchesQ = p.code.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()) || p.hsnCode.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !catFilter || p.category === catFilter;
    return matchesQ && matchesCat;
  });

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this product from the master?")) {
      if (db.products.delete(id)) { showToast("Product master deleted successfully", "success"); refresh(); }
      else showToast("Failed to delete product record", "error");
    }
  };

  const openProductForm = (prdId = null) => {
    const isEdit = prdId !== null;
    let p = isEdit ? db.products.getById(prdId) : { description: "", hsnCode: "", unit: "Pcs", category: "Raw Material", status: "active" };
    const units = ["Pcs", "Kg", "Mtrs", "Ltrs", "Nos", "Sets"];
    const categories = ["Raw Material", "Semi-Finished", "Capital Goods", "Finished", "Other"];

    const FormContent = () => {
      const [desc, setDesc] = useState(p.description);
      const [hsn, setHsn] = useState(p.hsnCode);
      const [unit, setUnit] = useState(p.unit);
      const [cat, setCat] = useState(p.category);
      const [status, setStatus] = useState(p.status);

      const handleSubmit = (e) => {
        e.preventDefault();
        const updatedPrd = { id: prdId || undefined, code: isEdit ? p.code : undefined, description: desc.trim(), hsnCode: hsn.trim(), unit, category: cat, status };
        if (db.products.save(updatedPrd)) { showToast(isEdit ? "Product master profile updated" : "Product registered successfully", "success"); closeModal(); refresh(); }
        else showToast("Failed to save product details", "error");
      };

      return (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Description / Name *</label>
            <input type="text" className="form-control" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. MS Plate 10mm" required />
          </div>
          <div className="form-row">
            <div className="form-group"><label>HSN Code *</label><input type="text" className="form-control" value={hsn} onChange={e => setHsn(e.target.value)} placeholder="8-digit GST HSN Code" required /></div>
            <div className="form-group"><label>Unit of Measure *</label><select className="form-control" value={unit} onChange={e => setUnit(e.target.value)} required>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Product Category *</label><select className="form-control" value={cat} onChange={e => setCat(e.target.value)} required>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label>Status *</label><select className="form-control" value={status} onChange={e => setStatus(e.target.value)} required><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Product Master</button>
          </div>
        </form>
      );
    };
    openModal(isEdit ? `✏️ Edit Product Profile - ${p.code}` : "➕ Register New Product Master Profile", <FormContent />);
  };

  const catColors = { "Raw Material": "background: rgba(14,165,233,0.12); color: #38bdf8;", "Semi-Finished": "background: rgba(167,139,250,0.12); color: #a78bfa;", "Capital Goods": "background: rgba(245,158,11,0.12); color: #fbbf24;", "Finished": "background: rgba(16,185,129,0.12); color: #34d399;" };

  return (
    <>
      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '300px' }}><input type="text" className="form-control" placeholder="Search Product Code, Name or HSN..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="form-group" style={{ maxWidth: '200px' }}>
          <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="Raw Material">Raw Material</option><option value="Semi-Finished">Semi-Finished</option><option value="Capital Goods">Capital Goods</option><option value="Finished">Finished Product</option><option value="Other">Other</option>
          </select>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => openProductForm()}>➕ Add Product Profile</button>}
      </div>
      <div className="card glass table-responsive">
        <table className="table-premium">
          <thead><tr><th>Product Code</th><th>Description / Name</th><th>HSN Code</th><th>Unit of Measure</th><th>Category</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No products registered in master list</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td><code>{p.code}</code></td>
                <td><strong>{p.description}</strong></td>
                <td><code>{p.hsnCode}</code></td>
                <td>{p.unit}</td>
                <td><span className="badge" style={catColors[p.category] ? Object.fromEntries(catColors[p.category].split(';').filter(s=>s.trim()).map(s => { const [k,v] = s.split(':'); return [k.trim(), v.trim()]; })) : {background:'rgba(255,255,255,0.05)'}}>{p.category}</span></td>
                <td><span className="badge" style={p.status === 'active' ? {background:'rgba(16,185,129,0.15)', color:'#34d399'} : {background:'rgba(239,68,68,0.15)', color:'#f87171'}}>{p.status}</span></td>
                {canEdit && <td>
                  <button className="btn btn-secondary btn-icon" onClick={() => openProductForm(p.id)}>✏️</button>
                  <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => handleDelete(p.id)}>🗑️</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
