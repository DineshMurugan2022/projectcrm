"use client";

import React, { useState, useEffect } from "react";
import { LeaveRequest } from "@/lib/types";
import {
  CalendarOff,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  RefreshCw,
  MessageSquare,
} from "lucide-react";

export default function LeaveAbsenceSection() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  // Rejection modal
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leaves");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApprove = async (leave: LeaveRequest) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/leaves/${leave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Approved",
          reviewNote: "Approved by HR Administration",
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeaves();
      }
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingLeave) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/leaves/${rejectingLeave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          reviewNote: rejectReason || "Request declined by HR Administration",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectingLeave(null);
        setRejectReason("");
        fetchLeaves();
      }
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter === "All") return true;
    return l.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
            <div className="text-xs text-[#706161]">Pending Approvals</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#234404]">{approvedCount}</div>
            <div className="text-xs text-[#706161]">Approved Requests</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EEFCD9] text-[#2c5306] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-red-700">{rejectedCount}</div>
            <div className="text-xs text-[#706161]">Rejected Requests</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F5F9F7] rounded-xl border border-[#DDEAE2]">
          {["All", "Pending", "Approved", "Rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab
                  ? "bg-[#162E3D] text-white shadow-sm"
                  : "text-[#706161] hover:text-[#162E3D]"
              }`}
            >
              {tab}{" "}
              {tab === "Pending" && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#45C512] text-[#162E3D] rounded-full text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={fetchLeaves}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] font-medium rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#162E3D]">
            <thead className="bg-[#162E3D] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Duration &amp; Dates</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Applied On</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">HR Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDEAE2]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-[#706161]">
                    Loading leave requests...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-[#706161]">
                    No leave requests found in this category.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="hover:bg-[#F5F9F7]/70 transition-colors"
                  >
                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#162E3D]">
                        {leave.employeeName || "Employee"}
                      </div>
                      <div className="text-[10px] text-[#706161]">{leave.department}</div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F5F9F7] border border-[#DDEAE2] font-semibold text-[11px] text-[#162E3D]">
                        {leave.leaveType}
                      </span>
                    </td>

                    {/* Dates & Days */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#162E3D]">
                        {leave.fromDate} {leave.fromDate !== leave.toDate && `to ${leave.toDate}`}
                      </div>
                      <div className="text-[10px] text-[#706161]">
                        {leave.days} {leave.days === 1 ? "day" : "days"}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-[#162E3D] line-clamp-2">{leave.reason}</div>
                      {leave.reviewNote && (
                        <div className="text-[10px] text-[#706161] mt-1 italic flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-[#45C512]" />
                          Note: {leave.reviewNote}
                        </div>
                      )}
                    </td>

                    {/* Applied Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#706161]">
                      {leave.appliedDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          leave.status === "Approved"
                            ? "bg-[#EEFCD9] text-[#2c5306] border border-[#45C512]/60"
                            : leave.status === "Pending"
                            ? "bg-amber-50 text-amber-800 border border-amber-300"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {leave.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(leave)}
                            disabled={actionLoading}
                            title="Approve Leave"
                            className="px-2.5 py-1.5 bg-[#45C512] hover:bg-[#91e73e] text-[#162E3D] font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingLeave(leave);
                              setRejectReason("");
                            }}
                            disabled={actionLoading}
                            title="Reject Leave"
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg border border-red-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#706161] font-mono">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162E3D]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-by-lg border border-[#DDEAE2] p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#162E3D]">
                Decline Leave Request
              </h3>
              <p className="text-xs text-[#706161] mt-1">
                Decline {rejectingLeave.leaveType} for{" "}
                <span className="font-bold text-[#162E3D]">
                  {rejectingLeave.employeeName}
                </span>{" "}
                ({rejectingLeave.fromDate} to {rejectingLeave.toDate}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#162E3D] mb-1">
                Reason / Feedback for Employee
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Critical client campaign delivery scheduled during these dates..."
                className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingLeave(null)}
                className="flex-1 py-2 text-xs font-semibold text-[#706161] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Declining..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
