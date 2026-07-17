// src/pages/DashboardPage.jsx
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { daysBetween, formatDate, getAgeColor } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { db } = useData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const dns = db.deliveryNotes.getAll();
  const activeDns = dns.filter(d => ["in_transit", "at_jobworker", "in_production", "partial_return"].includes(d.status));
  const inTransit = dns.filter(d => d.status === "in_transit");
  const atJobWorker = dns.filter(d => ["at_jobworker", "in_production"].includes(d.status));

  let pendingAcceptanceCount = 0;
  if (currentUser.role === "job_worker") {
    pendingAcceptanceCount = dns.filter(d => d.jobWorkerId === currentUser.linkedJobWorkerId && d.status === "in_transit").length;
  } else {
    pendingAcceptanceCount = dns.filter(d => d.status === "in_transit").length;
  }

  let overdueCount = 0, refreshDueCount = 0;
  const refreshAlerts = [];

  dns.forEach(dn => {
    if (["at_jobworker", "in_production", "partial_return"].includes(dn.status)) {
      const docAge = daysBetween(dn.dnDate);
      const principalDate = dn.isRefresh ? dn.refreshHistory[0].date : dn.dnDate;
      const matAge = daysBetween(principalDate);
      if (matAge > 90) overdueCount++;
      const daysToRefresh = 120 - docAge;
      if (daysToRefresh <= 15) {
        refreshDueCount++;
        refreshAlerts.push({ dnId: dn.id, dnNumber: dn.dnNumber, jobWorkerName: dn.jobWorkerName, daysRemaining: daysToRefresh, docAge });
      }
    }
  });

  // SVG Chart
  let bucket0_30 = 0, bucket31_90 = 0, bucket91_120 = 0, bucket120_plus = 0;
  dns.forEach(dn => {
    if (["at_jobworker", "in_production", "partial_return"].includes(dn.status)) {
      const principalDate = dn.isRefresh ? dn.refreshHistory[0].date : dn.dnDate;
      const age = daysBetween(principalDate);
      const qty = dn.materials.reduce((sum, m) => sum + (m.qtySent - m.qtyReturned), 0);
      if (age <= 30) bucket0_30 += qty;
      else if (age <= 90) bucket31_90 += qty;
      else if (age <= 120) bucket91_120 += qty;
      else bucket120_plus += qty;
    }
  });

  const total = bucket0_30 + bucket31_90 + bucket91_120 + bucket120_plus;
  const maxVal = Math.max(bucket0_30, bucket31_90, bucket91_120, bucket120_plus, 1);
  const getH = (v) => (v / maxVal) * 120;

  // Activity logs
  const logs = [];
  dns.forEach(dn => {
    dn.materials.forEach(mat => {
      mat.statusHistory.forEach(hist => {
        logs.push({ date: new Date(hist.date), text: <span>Challan <strong>{dn.dnNumber}</strong>: '{mat.description}' status changed to <strong>{hist.status.replace("_", " ")}</strong> ({hist.remarks})</span> });
      });
      mat.productionHistory.forEach(prod => {
        logs.push({ date: new Date(prod.date), text: <span>Production update for <strong>{dn.dnNumber}</strong>: Stage <strong>{prod.stage.replace("_", " ")}</strong> - {prod.qtyProcessed} units ({prod.qualityRemarks || "No remarks"})</span> });
      });
    });
  });
  logs.sort((a, b) => b.date - a.date);
  const activeLogs = logs.slice(0, 10);

  return (
    <>
      {/* KPI Row */}
      <div className="grid-6">
        {[
          { icon: "📋", bg: "rgba(99,102,241,0.15)", color: "var(--primary)", value: activeDns.length, title: "Active DNs" },
          { icon: "🚚", bg: "rgba(14,165,233,0.15)", color: "var(--info)", value: inTransit.length, title: "In Transit" },
          { icon: "🏭", bg: "rgba(245,158,11,0.15)", color: "var(--warning)", value: atJobWorker.length, title: "At JobWorker" },
          { icon: "📬", bg: "rgba(139,92,246,0.15)", color: "#8b5cf6", value: pendingAcceptanceCount, title: "Pend Accept" },
          { icon: "🚨", bg: "rgba(239,68,68,0.15)", color: "var(--danger)", value: overdueCount, title: "Overdue >90d" },
          { icon: "🔄", bg: "rgba(79,70,229,0.15)", color: "#4f46e5", value: refreshDueCount, title: "Refresh Due" },
        ].map((kpi, i) => (
          <div key={i} className="card glass kpi-card">
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>{kpi.icon}</div>
            <div className="kpi-details">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-title">{kpi.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid-2">
        <div className="card glass">
          <h3 style={{ marginBottom: '20px' }}>Aging Distribution (Materials Qty)</h3>
          <div className="chart-container">
            {total === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No active pending materials to analyze.</div>
            ) : (
              <svg viewBox="0 0 400 200" width="100%" height="100%">
                <line x1="40" y1="30" x2="360" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4"/>
                <line x1="40" y1="90" x2="360" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4"/>
                <line x1="40" y1="150" x2="360" y2="150" stroke="rgba(255,255,255,0.05)"/>
                <rect x="70" y={150 - getH(bucket0_30)} width="40" height={getH(bucket0_30)} fill="#10b981" rx="4"/>
                <text x="90" y={140 - getH(bucket0_30)} fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">{bucket0_30}</text>
                <text x="90" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">0-30 days</text>
                <rect x="150" y={150 - getH(bucket31_90)} width="40" height={getH(bucket31_90)} fill="#f59e0b" rx="4"/>
                <text x="170" y={140 - getH(bucket31_90)} fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">{bucket31_90}</text>
                <text x="170" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">31-90 days</text>
                <rect x="230" y={150 - getH(bucket91_120)} width="40" height={getH(bucket91_120)} fill="#f97316" rx="4"/>
                <text x="250" y={140 - getH(bucket91_120)} fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">{bucket91_120}</text>
                <text x="250" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">91-120 days</text>
                <rect x="310" y={150 - getH(bucket120_plus)} width="40" height={getH(bucket120_plus)} fill="#ef4444" rx="4"/>
                <text x="330" y={140 - getH(bucket120_plus)} fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">{bucket120_plus}</text>
                <text x="330" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">120+ days</text>
              </svg>
            )}
          </div>
        </div>
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px' }}>Recent System Activity</h3>
          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '250px' }}>
            {activeLogs.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '40px' }}>No recent activity logs.</div>
            ) : (
              <div className="timeline-list">
                {activeLogs.map((log, i) => (
                  <div key={i} className="timeline-event">
                    <div className="timeline-event-header">
                      <span>System Update</span>
                      <span>{formatDate(log.date)}</span>
                    </div>
                    <div className="timeline-event-content">{log.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refresh Alerts */}
      <div className="card glass" style={{ marginTop: '10px' }}>
        <h3 style={{ marginBottom: '20px' }}>🔄 Urgent 120-Day Document Refresh Alerts</h3>
        {refreshAlerts.length === 0 ? (
          <div className="alert-card alert-card-info">
            <div>
              <div className="alert-title">No pending document refreshes</div>
              <div className="alert-sub">All delivery notes are within the 120-day validity window.</div>
            </div>
          </div>
        ) : (
          refreshAlerts.map(alert => {
            const isCritical = alert.daysRemaining <= 3;
            return (
              <div key={alert.dnId} className={`alert-card ${isCritical ? 'alert-card-danger' : ''}`}>
                <div>
                  <div className="alert-title">📦 {alert.dnNumber} - {alert.jobWorkerName}</div>
                  <div className="alert-sub">
                    Document age: <strong>{alert.docAge} days</strong>. Refresh required in{' '}
                    <strong style={{ color: isCritical ? 'var(--danger)' : 'var(--warning)' }}>{alert.daysRemaining} days</strong>.
                  </div>
                </div>
                <div className="alert-actions">
                  <button className="btn btn-secondary btn-icon" onClick={() => navigate('/app/aging')} title="Process Document Refresh">
                    🔄 Process Refresh
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
