// src/components/Layout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const HEADERS = {
  dashboard: { title: "Dashboard", sub: "Outward material tracking overview" },
  users: { title: "User Management", sub: "Manage access control lists" },
  products: { title: "Product Master", sub: "Material master and HSN configurations" },
  jobworkers: { title: "Job Worker Master", sub: "Profiles & processing capabilities" },
  transporters: { title: "Transporter List", sub: "Logistics partners & vehicle profiles" },
  deliverynotes: { title: "Delivery Note (Challan)", sub: "Issue and track outward materials" },
  acceptance: { title: "Delivery Acceptance", sub: "Acknowledge material receipt at vendor location" },
  grn: { title: "Goods Receipt Note (GRN)", sub: "Receive returned finished/semifinished goods" },
  production: { title: "Production Tracking", sub: "Kanban board of manufacturing stages" },
  aging: { title: "Aging & Non-Moving Analysis", sub: "Aged inventory reports & challan refresh" }
};

export default function Layout() {
  const location = useLocation();
  const viewName = location.pathname.replace('/app/', '').replace('/app', '') || 'dashboard';
  const header = HEADERS[viewName] || { title: "JobWork Tracker", sub: "" };
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-US', options));
  }, []);

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>{header.title}</h1>
            <p>{header.sub}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
              <div>Local Date: <span>{currentDate}</span></div>
            </div>
          </div>
        </header>
        <div className="animate-fade-in" key={viewName}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
