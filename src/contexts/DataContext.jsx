// src/contexts/DataContext.jsx
// localStorage Data Layer for JobWork Tracker (ported from js/data.js)
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateId, clone } from '../utils/helpers';

const DataContext = createContext(null);

const DB_PREFIX = "jw_tracker_";
const KEYS = {
  USERS: DB_PREFIX + "users",
  JOB_WORKERS: DB_PREFIX + "job_workers",
  TRANSPORTERS: DB_PREFIX + "transporters",
  DELIVERY_NOTES: DB_PREFIX + "delivery_notes",
  GRNS: DB_PREFIX + "grns",
  PRODUCTS: DB_PREFIX + "products",
  CURRENT_USER: DB_PREFIX + "current_user",
  SET_INITIALIZED: DB_PREFIX + "initialized"
};

function read(key, defaultVal = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error("Error reading localStorage key: " + key, e);
    return defaultVal;
  }
}

function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error writing localStorage key: " + key, e);
    return false;
  }
}

function checkAndSeed() {
  if (localStorage.getItem(KEYS.SET_INITIALIZED)) {
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
      const seedProducts = [
        { id: "prd_001", code: "PRD-001", description: "Steel Shafts 50mm", hsnCode: "73269099", unit: "Pcs", category: "Raw Material", status: "active", createdAt: new Date().toISOString() },
        { id: "prd_002", code: "PRD-002", description: "MS Plates 10mm", hsnCode: "72085110", unit: "Kg", category: "Raw Material", status: "active", createdAt: new Date().toISOString() },
        { id: "prd_003", code: "PRD-003", description: "Steel Safety Rails", hsnCode: "73089090", unit: "Nos", category: "Semi-Finished", status: "active", createdAt: new Date().toISOString() },
        { id: "prd_004", code: "PRD-004", description: "CI Block Base", hsnCode: "84833000", unit: "Nos", category: "Capital Goods", status: "active", createdAt: new Date().toISOString() },
        { id: "prd_005", code: "PRD-005", description: "MS Flange 4-Inch", hsnCode: "73079190", unit: "Pcs", category: "Raw Material", status: "active", createdAt: new Date().toISOString() }
      ];
      write(KEYS.PRODUCTS, seedProducts);
    }
    return;
  }

  const daysAgo = (d) => {
    const date = new Date();
    date.setDate(date.getDate() - d);
    return date.toISOString().split("T")[0];
  };

  // 1. Users
  const seedUsers = [
    { id: "usr_admin", fullName: "Administrator", username: "admin", password: "admin123", email: "admin@company.com", phone: "+91 98765 43210", role: "admin", allowedScreens: ["dashboard", "delivery_notes", "grns", "masters", "users", "reports"], linkedJobWorkerId: null, status: "active", createdAt: new Date().toISOString() },
    { id: "usr_manager", fullName: "Suresh Sharma (Store Mgr)", username: "manager", password: "manager123", email: "suresh.s@company.com", phone: "+91 98765 43211", role: "store_manager", allowedScreens: ["dashboard", "delivery_notes", "grns", "masters"], linkedJobWorkerId: null, status: "active", createdAt: new Date().toISOString() },
    { id: "usr_operator", fullName: "Ramesh Patil (Store Op)", username: "operator", password: "operator123", email: "ramesh.p@company.com", phone: "+91 98765 43212", role: "store_operator", allowedScreens: ["dashboard", "delivery_notes", "grns"], linkedJobWorkerId: null, status: "active", createdAt: new Date().toISOString() },
    { id: "usr_vendor", fullName: "Rajesh Kumar (Job Worker)", username: "vendor", password: "vendor123", email: "rajesh@supermachining.com", phone: "+91 98765 43213", role: "job_worker", allowedScreens: ["dashboard", "delivery_notes"], linkedJobWorkerId: "jw_001", status: "active", createdAt: new Date().toISOString() },
    { id: "usr_viewer", fullName: "Auditor (Viewer)", username: "viewer", password: "viewer123", email: "auditor@company.com", phone: "+91 98765 43214", role: "viewer", allowedScreens: ["dashboard", "reports"], linkedJobWorkerId: null, status: "active", createdAt: new Date().toISOString() }
  ];
  write(KEYS.USERS, seedUsers);

  // 2. Job Workers
  const seedJobWorkers = [
    { id: "jw_001", code: "JW-001", companyName: "Super Machining Works", gstin: "27AAAAA1111A1Z1", contactPerson: "Rajesh Kumar", phone: "+91 91234 56780", email: "info@supermachining.com", address: { line1: "G-12, MIDC Industrial Area", line2: "Near Tata Power Station", city: "Mumbai", state: "Maharashtra", pinCode: "400072" }, capabilities: ["Machining", "Drilling", "Lathe Turning"], status: "active", createdAt: new Date().toISOString() },
    { id: "jw_002", code: "JW-002", companyName: "Apex Heat Treaters", gstin: "27BBBBB2222B2Z2", contactPerson: "Milind Deshmukh", phone: "+91 91234 56781", email: "apex.heat@gmail.com", address: { line1: "Sector 10, Bhosari MIDC", line2: "Opposite Kinetic Tata", city: "Pune", state: "Maharashtra", pinCode: "411026" }, capabilities: ["Heat Treatment", "Annealing", "Tempering"], status: "active", createdAt: new Date().toISOString() },
    { id: "jw_003", code: "JW-003", companyName: "Zenith Coating Co.", gstin: "27CCCCC3333C3Z3", contactPerson: "Amir Khan", phone: "+91 91234 56782", email: "zenith.coat@zenith.com", address: { line1: "Plot No. 44, Ambad MIDC", line2: "Behind Garware Polyester", city: "Nashik", state: "Maharashtra", pinCode: "422010" }, capabilities: ["Powder Coating", "Painting", "Anodizing"], status: "active", createdAt: new Date().toISOString() }
  ];
  write(KEYS.JOB_WORKERS, seedJobWorkers);

  // 3. Transporters
  const seedTransporters = [
    { id: "tr_001", code: "TR-001", companyName: "Speedy Logistics & Transport", contactPerson: "Gurpreet Singh", phone: "+91 99988 87776", email: "speedy@logistics.com", address: "Transport Nagar, Nigdi, Pune", vehicles: [{ vehicleNumber: "MH-12-PQ-1234", vehicleType: "Tata Ace (Tempo)", driverName: "Dilip Kumar", driverPhone: "+91 88888 11111" }, { vehicleNumber: "MH-12-RS-5678", vehicleType: "Eicher Pro (14ft)", driverName: "Karan Singh", driverPhone: "+91 88888 22222" }], status: "active", createdAt: new Date().toISOString() },
    { id: "tr_002", code: "TR-002", companyName: "Safe-Move Logistics", contactPerson: "Vikas Patel", phone: "+91 99988 87777", email: "safemove@logistics.com", address: "Kalamboli Steel Market, Navi Mumbai", vehicles: [{ vehicleNumber: "MH-43-Y-9988", vehicleType: "Taurus 10-Wheeler", driverName: "Satnam Singh", driverPhone: "+91 88888 33333" }], status: "active", createdAt: new Date().toISOString() }
  ];
  write(KEYS.TRANSPORTERS, seedTransporters);

  // 4. Delivery Notes
  const dn1Id = "dn_001", dn2Id = "dn_002", dn3Id = "dn_003", dn4Id = "dn_004";
  const seedDeliveryNotes = [
    { id: dn1Id, dnNumber: "DN/2026-27/0001", dnDate: daysAgo(125), jobWorkerId: "jw_001", jobWorkerName: "Super Machining Works", purpose: "Job work machining and threading", materials: [{ id: "mat_001_1", description: "Steel Shafts 50mm", hsnCode: "73269099", qtySent: 500, qtyReturned: 100, qtyInProcess: 0, qtyCompleted: 0, qtyAcceptedByVendor: 500, qtyShortage: 0, unit: "Pcs", estimatedReturnDate: daysAgo(95), statusHistory: [{ status: "dispatched", date: daysAgo(125), remarks: "Dispatched to vendor", qtyAffected: 500 }, { status: "accepted", date: daysAgo(123), remarks: "All quantities received in good condition", qtyAffected: 500 }], productionHistory: [], currentStatus: "refreshed", currentProductionStage: null }], transporterId: "tr_001", transporterName: "Speedy Logistics & Transport", vehicleNumber: "MH-12-PQ-1234", driverName: "Dilip Kumar", driverPhone: "+91 88888 11111", lrNumber: "LR-10029", dispatchDateTime: daysAgo(125) + "T10:00", status: "refreshed", preparedBy: "Ramesh Patil (Store Op)", remarks: "Urgent job work for customer project X", createdAt: new Date(daysAgo(125)).toISOString(), principalChallanId: null, principalChallanNumber: null, isRefresh: false, refreshedFromId: null, refreshedToId: dn4Id, refreshCount: 1, refreshHistory: [] },
    { id: dn2Id, dnNumber: "DN/2026-27/0002", dnDate: daysAgo(15), jobWorkerId: "jw_002", jobWorkerName: "Apex Heat Treaters", purpose: "Induction hardening and stress relieving", materials: [{ id: "mat_002_1", description: "MS Plates 10mm", hsnCode: "72085110", qtySent: 1000, qtyReturned: 0, qtyInProcess: 1000, qtyCompleted: 0, qtyAcceptedByVendor: 1000, qtyShortage: 0, unit: "Kg", estimatedReturnDate: daysAgo(-15), statusHistory: [{ status: "dispatched", date: daysAgo(15), remarks: "Outward dispatch", qtyAffected: 1000 }, { status: "accepted", date: daysAgo(14), remarks: "Received", qtyAffected: 1000 }], productionHistory: [{ stage: "queued", date: daysAgo(14), qtyProcessed: 1000, batchNumber: "B-HEAT-99", qualityRemarks: "Stored in warehouse yard A", expectedCompletionDate: daysAgo(-5), updatedAt: new Date(daysAgo(14)).toISOString() }], currentStatus: "at_jobworker", currentProductionStage: "queued" }], transporterId: "tr_002", transporterName: "Safe-Move Logistics", vehicleNumber: "MH-43-Y-9988", driverName: "Satnam Singh", driverPhone: "+91 88888 33333", lrNumber: "LR-99887", dispatchDateTime: daysAgo(15) + "T14:30", status: "in_production", preparedBy: "Suresh Sharma (Store Mgr)", remarks: "QC report must accompany shipment", createdAt: new Date(daysAgo(15)).toISOString(), principalChallanId: null, principalChallanNumber: null, isRefresh: false, refreshedFromId: null, refreshedToId: null, refreshCount: 0, refreshHistory: [] },
    { id: dn3Id, dnNumber: "DN/2026-27/0003", dnDate: daysAgo(0), jobWorkerId: "jw_003", jobWorkerName: "Zenith Coating Co.", purpose: "Epoxy powder coating - safety yellow", materials: [{ id: "mat_003_1", description: "Steel Safety Rails", hsnCode: "73089090", qtySent: 50, qtyReturned: 0, qtyInProcess: 0, qtyCompleted: 0, qtyAcceptedByVendor: 0, qtyShortage: 0, unit: "Nos", estimatedReturnDate: daysAgo(-10), statusHistory: [], productionHistory: [], currentStatus: "draft", currentProductionStage: null }], transporterId: null, transporterName: null, vehicleNumber: null, driverName: null, driverPhone: null, lrNumber: null, dispatchDateTime: null, status: "draft", preparedBy: "Ramesh Patil (Store Op)", remarks: "Draft for review", createdAt: new Date().toISOString(), principalChallanId: null, principalChallanNumber: null, isRefresh: false, refreshedFromId: null, refreshedToId: null, refreshCount: 0, refreshHistory: [] },
    { id: dn4Id, dnNumber: "DN/2026-27/0004", dnDate: daysAgo(5), jobWorkerId: "jw_001", jobWorkerName: "Super Machining Works", purpose: "Job work machining and threading", materials: [{ id: "mat_004_1", description: "Steel Shafts 50mm", hsnCode: "73269099", qtySent: 400, qtyReturned: 0, qtyInProcess: 400, qtyCompleted: 0, qtyAcceptedByVendor: 400, qtyShortage: 0, unit: "Pcs", estimatedReturnDate: daysAgo(-25), statusHistory: [{ status: "dispatched", date: daysAgo(5), remarks: "Refreshed Challan Dispatched", qtyAffected: 400 }, { status: "accepted", date: daysAgo(5), remarks: "Refreshed quantity approved at vendor site", qtyAffected: 400 }], productionHistory: [{ stage: "queued", date: daysAgo(5), qtyProcessed: 400, batchNumber: "B-SHAFT-22", qualityRemarks: "Queued at Line 3", expectedCompletionDate: daysAgo(-10), updatedAt: new Date(daysAgo(5)).toISOString() }, { stage: "in_process", date: daysAgo(3), qtyProcessed: 300, batchNumber: "B-SHAFT-22", qualityRemarks: "Turning in progress", expectedCompletionDate: daysAgo(-8), updatedAt: new Date(daysAgo(3)).toISOString() }], currentStatus: "at_jobworker", currentProductionStage: "in_process", originalQtyInPrincipal: 500, qtyAtTimeOfRefresh: 400, refreshQty: 400, varianceFromPending: 0, varianceReason: "", scrapLossQty: 0, scrapLossRemarks: "" }], transporterId: "tr_001", transporterName: "Speedy Logistics & Transport", vehicleNumber: "MH-12-PQ-1234", driverName: "Dilip Kumar", driverPhone: "+91 88888 11111", lrNumber: "LR-10142", dispatchDateTime: daysAgo(5) + "T09:30", status: "in_production", preparedBy: "Suresh Sharma (Store Mgr)", remarks: "120-Day Document Refresh for Principal Challan DN/2026-27/0001", createdAt: new Date(daysAgo(5)).toISOString(), principalChallanId: dn1Id, principalChallanNumber: "DN/2026-27/0001", isRefresh: true, refreshedFromId: dn1Id, refreshedToId: null, refreshCount: 1, refreshHistory: [{ challanId: dn1Id, challanNumber: "DN/2026-27/0001", date: daysAgo(125) }] }
  ];
  write(KEYS.DELIVERY_NOTES, seedDeliveryNotes);

  // 5. GRNs
  const seedGRNs = [
    { id: "grn_001", grnNumber: "GRN/2026-27/0001", grnDate: daysAgo(30), deliveryNoteId: dn1Id, dnNumber: "DN/2026-27/0001", jobWorkerId: "jw_001", jobWorkerName: "Super Machining Works", materialReceipts: [{ materialId: "mat_001_1", description: "Steel Shafts 50mm", dnQty: 500, alreadyReturned: 0, pendingQty: 500, receivingNow: 100, acceptedQty: 98, rejectedQty: 2, rejectionReason: "Dimension mismatch", remarks: "2 pcs rejected due to thread pitch error, returned for record" }], vehicleNumber: "MH-12-PQ-1234", lrNumber: "LR-RETURN-102", receivedBy: "Ramesh Patil (Store Op)", inspectionDone: true, inspectorName: "R. Patil", inspectionDate: daysAgo(30), qcStatus: "conditional", qcRemarks: "98 pcs passed inspection. 2 pcs failed dimensions.", status: "confirmed", createdAt: new Date(daysAgo(30)).toISOString() }
  ];
  write(KEYS.GRNS, seedGRNs);

  // 6. Products
  const seedProducts = [
    { id: "prd_001", code: "PRD-001", description: "Steel Shafts 50mm", hsnCode: "73269099", unit: "Pcs", category: "Raw Material", status: "active", createdAt: new Date().toISOString() },
    { id: "prd_002", code: "PRD-002", description: "MS Plates 10mm", hsnCode: "72085110", unit: "Kg", category: "Raw Material", status: "active", createdAt: new Date().toISOString() },
    { id: "prd_003", code: "PRD-003", description: "Steel Safety Rails", hsnCode: "73089090", unit: "Nos", category: "Semi-Finished", status: "active", createdAt: new Date().toISOString() },
    { id: "prd_004", code: "PRD-004", description: "CI Block Base", hsnCode: "84833000", unit: "Nos", category: "Capital Goods", status: "active", createdAt: new Date().toISOString() },
    { id: "prd_005", code: "PRD-005", description: "MS Flange 4-Inch", hsnCode: "73079190", unit: "Pcs", category: "Raw Material", status: "active", createdAt: new Date().toISOString() }
  ];
  write(KEYS.PRODUCTS, seedProducts);

  localStorage.setItem(KEYS.SET_INITIALIZED, "true");
}

// API Methods
const createDataAPI = () => ({
  users: {
    getAll: () => read(KEYS.USERS),
    getById: (id) => read(KEYS.USERS).find(u => u.id === id),
    getByUsername: (uname) => read(KEYS.USERS).find(u => u.username === uname),
    save: (user) => {
      const users = read(KEYS.USERS);
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) { users[idx] = user; } else { user.id = generateId("usr"); user.createdAt = new Date().toISOString(); users.push(user); }
      return write(KEYS.USERS, users) ? user : null;
    },
    delete: (id) => { const users = read(KEYS.USERS); return write(KEYS.USERS, users.filter(u => u.id !== id)); }
  },
  jobWorkers: {
    getAll: () => read(KEYS.JOB_WORKERS),
    getById: (id) => read(KEYS.JOB_WORKERS).find(jw => jw.id === id),
    save: (jw) => {
      const jws = read(KEYS.JOB_WORKERS);
      const idx = jws.findIndex(item => item.id === jw.id);
      if (idx !== -1) { jws[idx] = jw; } else { jw.id = generateId("jw"); jw.code = "JW-" + String(jws.length + 1).padStart(3, "0"); jw.createdAt = new Date().toISOString(); jws.push(jw); }
      return write(KEYS.JOB_WORKERS, jws) ? jw : null;
    }
  },
  transporters: {
    getAll: () => read(KEYS.TRANSPORTERS),
    getById: (id) => read(KEYS.TRANSPORTERS).find(t => t.id === id),
    save: (tr) => {
      const trs = read(KEYS.TRANSPORTERS);
      const idx = trs.findIndex(item => item.id === tr.id);
      if (idx !== -1) { trs[idx] = tr; } else { tr.id = generateId("tr"); tr.code = "TR-" + String(trs.length + 1).padStart(3, "0"); tr.createdAt = new Date().toISOString(); trs.push(tr); }
      return write(KEYS.TRANSPORTERS, trs) ? tr : null;
    }
  },
  deliveryNotes: {
    getAll: () => read(KEYS.DELIVERY_NOTES),
    getById: (id) => read(KEYS.DELIVERY_NOTES).find(dn => dn.id === id),
    getByNumber: (num) => read(KEYS.DELIVERY_NOTES).find(dn => dn.dnNumber === num),
    save: (dn) => {
      const dns = read(KEYS.DELIVERY_NOTES);
      const idx = dns.findIndex(item => item.id === dn.id);
      if (idx !== -1) { dns[idx] = dn; } else { dn.id = generateId("dn"); dn.createdAt = new Date().toISOString(); dns.push(dn); }
      return write(KEYS.DELIVERY_NOTES, dns) ? dn : null;
    },
    getNextNumber: () => { const dns = read(KEYS.DELIVERY_NOTES); return "DN/2026-27/" + String(dns.length + 1).padStart(4, "0"); }
  },
  grns: {
    getAll: () => read(KEYS.GRNS),
    getById: (id) => read(KEYS.GRNS).find(g => g.id === id),
    save: (grn) => {
      const grns = read(KEYS.GRNS);
      const idx = grns.findIndex(item => item.id === grn.id);
      if (idx !== -1) { grns[idx] = grn; } else { grn.id = generateId("grn"); grn.createdAt = new Date().toISOString(); grns.push(grn); }
      return write(KEYS.GRNS, grns) ? grn : null;
    },
    getNextNumber: () => { const grns = read(KEYS.GRNS); return "GRN/2026-27/" + String(grns.length + 1).padStart(4, "0"); }
  },
  products: {
    getAll: () => read(KEYS.PRODUCTS),
    getById: (id) => read(KEYS.PRODUCTS).find(p => p.id === id),
    save: (prd) => {
      const prds = read(KEYS.PRODUCTS);
      const idx = prds.findIndex(item => item.id === prd.id);
      if (idx !== -1) { prds[idx] = prd; } else { prd.id = generateId("prd"); prd.code = "PRD-" + String(prds.length + 1).padStart(3, "0"); prd.createdAt = new Date().toISOString(); prds.push(prd); }
      return write(KEYS.PRODUCTS, prds) ? prd : null;
    },
    delete: (id) => { const prds = read(KEYS.PRODUCTS); return write(KEYS.PRODUCTS, prds.filter(p => p.id !== id)); }
  },
  session: {
    getCurrent: () => read(KEYS.CURRENT_USER, null),
    setCurrent: (user) => write(KEYS.CURRENT_USER, user),
    clear: () => localStorage.removeItem(KEYS.CURRENT_USER)
  }
});

export function DataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const db = createDataAPI();

  useEffect(() => {
    checkAndSeed();
  }, []);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  return (
    <DataContext.Provider value={{ db, refresh, version }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
