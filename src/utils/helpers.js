// src/utils/helpers.js
// Shared utilities for JobWork Tracker (ported from js/utils.js)

export const daysBetween = (d1, d2 = new Date()) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  date1.setHours(0, 0, 0, 0);
  date2.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatDate = (dateStr, type = "short") => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  if (type === "input") {
    return date.toISOString().split("T")[0];
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

export const getStatusColor = (status) => {
  const map = {
    draft: { bg: "rgba(100, 116, 139, 0.2)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" },
    in_transit: { bg: "rgba(14, 165, 233, 0.2)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" },
    at_jobworker: { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
    in_production: { bg: "rgba(139, 92, 246, 0.2)", text: "#a78bfa", border: "rgba(167, 139, 250, 0.3)" },
    partial_return: { bg: "rgba(236, 72, 153, 0.2)", text: "#f472b6", border: "rgba(244, 114, 182, 0.3)" },
    fully_returned: { bg: "rgba(16, 185, 129, 0.2)", text: "#34d399", border: "rgba(52, 211, 153, 0.3)" },
    refreshed: { bg: "rgba(79, 70, 229, 0.2)", text: "#818cf8", border: "rgba(129, 140, 248, 0.3)" }
  };
  return map[status] || { bg: "rgba(148, 163, 184, 0.2)", text: "#cbd5e1", border: "rgba(203, 213, 225, 0.3)" };
};

export const getStageColor = (stage) => {
  const map = {
    queued: { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "#0284c7" },
    in_process: { bg: "rgba(167, 139, 250, 0.15)", text: "#a78bfa", border: "#7c3aed" },
    partially_processed: { bg: "rgba(244, 114, 182, 0.15)", text: "#f472b6", border: "#db2777" },
    quality_check: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", border: "#d97706" },
    rework: { bg: "rgba(248, 113, 113, 0.15)", text: "#f87171", border: "#dc2626" },
    ready_for_dispatch: { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399", border: "#059669" }
  };
  return map[stage] || { bg: "rgba(148, 163, 184, 0.15)", text: "#cbd5e1", border: "#475569" };
};

export const getAgeColor = (days) => {
  if (days <= 30) return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", class: "age-green" };
  if (days <= 90) return { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", class: "age-yellow" };
  if (days <= 120) return { bg: "rgba(249, 115, 22, 0.15)", text: "#fb923c", class: "age-orange" };
  return { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", class: "age-red" };
};

export const clone = (obj) => JSON.parse(JSON.stringify(obj));

export const generateId = (prefix = "id") => {
  return prefix + "_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
};
