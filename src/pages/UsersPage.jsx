// src/pages/UsersPage.jsx
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useModal } from '../components/Modal';
import { formatDate } from '../utils/helpers';

export default function UsersPage() {
  const { db, refresh } = useData();
  const { currentUser, checkAccess, getAllMenus } = useAuth();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  if (!checkAccess(["admin"])) {
    return (<div className="card glass text-center" style={{ padding: '40px' }}><h3 style={{ color: 'var(--danger)' }}>🚨 Access Denied</h3><p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Only administrators are permitted to view User Management.</p></div>);
  }

  const allUsers = db.users.getAll();
  const filtered = allUsers.filter(u => {
    const matchesQ = u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesQ && matchesRole;
  });

  const handleDelete = (id) => {
    if (id === "usr_admin") { showToast("Cannot delete primary administrator account", "error"); return; }
    if (confirm("Are you sure you want to delete this user?")) {
      if (db.users.delete(id)) { showToast("User deleted successfully", "success"); refresh(); }
      else showToast("Error deleting user", "error");
    }
  };

  const roleColors = { admin: { background: 'rgba(139,92,246,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }, store_manager: { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }, store_operator: { background: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)' }, job_worker: { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }, viewer: { background: 'rgba(148,163,184,0.15)', color: '#cbd5e1', border: '1px solid rgba(203,213,225,0.3)' } };

  const openUserForm = (userId = null) => {
    const isEdit = userId !== null;
    let user = isEdit ? db.users.getById(userId) : { fullName: "", username: "", password: "", role: "store_operator", email: "", phone: "", linkedJobWorkerId: null, status: "active", allowedScreens: [] };
    const workers = db.jobWorkers.getAll();
    const menus = getAllMenus();

    const FormContent = () => {
      const [fullName, setFullName] = useState(user.fullName);
      const [username, setUsername] = useState(user.username);
      const [password, setPassword] = useState(user.password);
      const [role, setRole] = useState(user.role);
      const [linkedJobWorkerId, setLinkedJobWorkerId] = useState(user.linkedJobWorkerId || '');
      const [email, setEmail] = useState(user.email);
      const [phone, setPhone] = useState(user.phone || '');
      const [status, setStatus] = useState(user.status);
      const [allowedScreens, setAllowedScreens] = useState(user.allowedScreens || []);

      const toggleScreen = (screenId) => setAllowedScreens(prev => prev.includes(screenId) ? prev.filter(s => s !== screenId) : [...prev, screenId]);

      const handleSubmit = (e) => {
        e.preventDefault();
        if (role === "job_worker" && !linkedJobWorkerId) { showToast("Please link a job worker profile for vendor accounts", "error"); return; }
        if (!userId) { const exists = db.users.getByUsername(username.trim()); if (exists) { showToast("Username already exists", "error"); return; } }
        const updatedUser = { id: userId || undefined, fullName: fullName.trim(), username: username.trim(), password, role, linkedJobWorkerId: role === "job_worker" ? linkedJobWorkerId : null, email: email.trim(), phone: phone.trim(), status, allowedScreens, lastLogin: isEdit ? user.lastLogin : null };
        if (db.users.save(updatedUser)) { showToast(isEdit ? "User updated successfully" : "User created successfully", "success"); closeModal(); refresh(); }
        else showToast("Failed to save user details", "error");
      };

      return (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input type="text" className="form-control" value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
            <div className="form-group"><label>Username *</label><input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} disabled={isEdit} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Password *</label><input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <div className="form-group"><label>Role *</label>
              <select className="form-control" value={role} onChange={e => setRole(e.target.value)} required>
                <option value="admin">Admin</option><option value="store_manager">Store Manager</option><option value="store_operator">Store Operator</option><option value="job_worker">Job Worker (Vendor)</option><option value="viewer">Viewer (Auditor)</option>
              </select>
            </div>
          </div>
          {role === 'job_worker' && (
            <div className="form-group"><label>Link to Job Worker *</label>
              <select className="form-control" value={linkedJobWorkerId} onChange={e => setLinkedJobWorkerId(e.target.value)} required>
                <option value="">-- Select Job Worker Profile --</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.code} - {w.companyName}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group"><label>Email Address *</label><input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="form-group"><label>Phone Number</label><input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Status *</label><select className="form-control" value={status} onChange={e => setStatus(e.target.value)} required><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div className="form-group">
            <label>Allowed Screens *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              {menus.map(m => <label key={m.id} className="form-check"><input type="checkbox" checked={allowedScreens.includes(m.id)} onChange={() => toggleScreen(m.id)} /><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.label}</span></label>)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save User Details</button>
          </div>
        </form>
      );
    };
    openModal(isEdit ? "✏️ Edit User Details" : "👤 Add New System User", <FormContent />);
  };

  return (
    <>
      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: '300px' }}><input type="text" className="form-control" placeholder="Search by name/username..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="form-group" style={{ maxWidth: '200px' }}>
          <select className="form-control" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option><option value="admin">Admin</option><option value="store_manager">Store Manager</option><option value="store_operator">Store Operator</option><option value="job_worker">Job Worker</option><option value="viewer">Viewer</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => openUserForm()}>➕ Add User</button>
      </div>
      <div className="card glass table-responsive">
        <table className="table-premium">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</td></tr> :
            filtered.map(u => (
              <tr key={u.id}>
                <td><strong>{u.fullName}</strong></td>
                <td><code>{u.username}</code></td>
                <td><span className="badge" style={roleColors[u.role] || {}}>{u.role.replace("_", " ")}</span></td>
                <td>{u.email}</td>
                <td>{u.phone || "N/A"}</td>
                <td><span className="badge" style={u.status === 'active' ? {background:'rgba(16,185,129,0.15)',color:'#34d399'} : {background:'rgba(239,68,68,0.15)',color:'#f87171'}}>{u.status}</span></td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.lastLogin)}</td>
                <td>
                  <button className="btn btn-secondary btn-icon" onClick={() => openUserForm(u.id)} title="Edit User">✏️</button>
                  <button className="btn btn-secondary btn-icon" onClick={() => handleDelete(u.id)} title="Delete User">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
