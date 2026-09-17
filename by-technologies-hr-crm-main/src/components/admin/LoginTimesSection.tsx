"use client";

import React, { useState, useEffect } from "react";
import { LoginLog } from "@/lib/types";
import {
  History,
  Search,
  Download,
  ShieldCheck,
  Globe,
  Laptop,
  Clock,
  RefreshCw,
  Lock,
  Trash2,
} from "lucide-react";

export default function LoginTimesSection() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllLogs = async () => {
    if (!confirm("Are you sure you want to clear all login activity records? This action cannot be undone.")) {
      return;
    }
    try {
      setClearing(true);
      const res = await fetch("/api/logs", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.employeeName.toLowerCase().includes(q) ||
      (log.empId && log.empId.toLowerCase().includes(q)) ||
      (log.email && log.email.toLowerCase().includes(q)) ||
      log.ipAddress.includes(q)
    );
  });

  const exportCsv = () => {
    const headers = ["Timestamp", "Employee ID", "Employee Name", "Email", "IP Address", "User Agent"];
    const rows = filteredLogs.map((l) => [
      `"${l.loginTime}"`,
      `"${l.empId || ""}"`,
      `"${l.employeeName}"`,
      `"${l.email || ""}"`,
      `"${l.ipAddress}"`,
      `"${l.userAgent.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BY_Technologies_Employee_Login_Logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        dateStr: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        timeStr: d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    } catch {
      return { dateStr: iso, timeStr: "" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#162E3D]">Employee Portal Login Audit</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#EEF9EB] text-[#2c5306] font-bold text-[10px] border border-[#45C512]/60">
              Security Trail
            </span>
          </div>
          <p className="text-xs text-[#5B7586] mt-0.5">
            Real-time audit log of employee portal logins, captured with timestamp, IP address, and browser metadata.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {logs.length > 0 && (
            <button
              onClick={handleClearAllLogs}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-all border border-red-200 cursor-pointer disabled:opacity-50"
              title="Clear all login activity records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? "Clearing..." : "Clear Logs"}
            </button>
          )}
          <button
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#162E3D] hover:bg-[#234358] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#45C512]" />
            Export CSV Log
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-[#5B7586] hover:text-[#162E3D] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5B7586] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search logs by employee name, work email, or IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D]"
          />
        </div>
        <div className="text-xs font-semibold text-[#5B7586] hidden sm:block">
          Showing {filteredLogs.length} events
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#162E3D]">
            <thead className="bg-[#162E3D] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Device &amp; Client Browser</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDEAE2]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-[#5B7586]">
                    Fetching login activity records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-[#5B7586]">
                    No login records matching your search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { dateStr, timeStr } = formatTimestamp(log.loginTime);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#F5F9F7]/70 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#162E3D] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#5B7586]" />
                          <span>{timeStr}</span>
                        </div>
                        <div className="text-[11px] text-[#5B7586] font-mono">{dateStr}</div>
                      </td>

                      {/* Employee */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#162E3D]">{log.employeeName}</div>
                        <div className="text-[11px] text-[#5B7586] font-mono">{log.empId ? `ID: ${log.empId}` : log.email}</div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#162E3D]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F9F7] rounded border border-[#DDEAE2]">
                          <Globe className="w-3 h-3 text-[#5B7586]" />
                          {log.ipAddress}
                        </span>
                      </td>

                      {/* User Agent */}
                      <td className="py-3.5 px-4 text-[11px] text-[#5B7586] max-w-sm truncate" title={log.userAgent}>
                        <div className="flex items-center gap-1.5 truncate">
                          <Laptop className="w-3.5 h-3.5 text-[#162E3D] flex-shrink-0" />
                          <span className="truncate">{log.userAgent}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EEF9EB] text-[#2c5306] border border-[#45C512]/60">
                          <ShieldCheck className="w-3 h-3 text-[#39A90E]" />
                          Verified
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          title="Delete this log record"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
