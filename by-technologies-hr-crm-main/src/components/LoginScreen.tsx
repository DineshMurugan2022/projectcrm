"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shield, User, Lock, Mail, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginScreen() {
  const { loginAdmin, loginEmployee } = useAuth();

  const [activeTab, setActiveTab] = useState<"admin" | "employee">("admin");

  // Clean form state with NO hardcoded sample logins
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Employee form state (Employee ID or Name - no email required)
  const [employeeIdentifier, setEmployeeIdentifier] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginAdmin(adminPassword, adminUsername);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Invalid admin credentials");
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginEmployee(employeeIdentifier, employeePassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to log in");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9F7] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#45C512] selection:text-[#162E3D]">
      {/* Background ambient branding accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#45C512]/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#162E3D]/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-by border border-[#DDEAE2] mb-4">
            <img
              src="/logo.png"
              alt="B & Y Technologies Logo"
              className="h-12 sm:h-14 mx-auto object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-[#162E3D] font-serif uppercase">
            Enterprise Cloud HRMS
          </h1>
          <p className="text-xs font-semibold tracking-widest text-[#5B7586] uppercase mt-1">
            B &amp; Y Technologies • Digital Workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-by-lg border border-[#DDEAE2] overflow-hidden">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#DDEAE2] bg-[#F5F9F7]/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setError(null);
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "admin"
                  ? "bg-[#162E3D] text-white shadow-sm"
                  : "text-[#5B7586] hover:text-[#162E3D] hover:bg-white/60"
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${activeTab === "admin" ? "text-[#45C512]" : ""}`} />
              HR Admin Login
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("employee");
                setError(null);
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "employee"
                  ? "bg-[#162E3D] text-white shadow-sm"
                  : "text-[#5B7586] hover:text-[#162E3D] hover:bg-white/60"
              }`}
            >
              <User className={`w-3.5 h-3.5 ${activeTab === "employee" ? "text-[#45C512]" : ""}`} />
              Employee Portal
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Alert Banner */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{error}</div>
              </div>
            )}

            {activeTab === "admin" ? (
              /* HR ADMIN LOGIN FORM */
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#162E3D] uppercase tracking-wider mb-1.5">
                    Admin Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Enter admin username"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F9F7]/60 border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] focus:border-transparent text-[#162E3D]"
                    />
                    <User className="w-4 h-4 text-[#5B7586] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] uppercase tracking-wider mb-1.5">
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F9F7]/60 border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] focus:border-transparent text-[#162E3D]"
                    />
                    <Lock className="w-4 h-4 text-[#5B7586] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#162E3D] hover:bg-[#234358] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70"
                  >
                    {loading ? "Authenticating..." : "Access HR Admin Workspace"}
                    <ArrowRight className="w-4 h-4 text-[#45C512] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            ) : (
              /* EMPLOYEE LOGIN FORM - NO EMAIL REQUIRED */
              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#162E3D] uppercase tracking-wider">
                      Employee ID (or Name)
                    </label>
                    <span className="text-[10px] text-[#45C512] bg-[#162E3D] px-2 py-0.5 rounded font-mono font-bold">
                      Employee ID / Name
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={employeeIdentifier}
                      onChange={(e) => setEmployeeIdentifier(e.target.value)}
                      placeholder="Enter Employee ID (e.g. BYT-101) or Name"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F9F7]/60 border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] focus:border-transparent text-[#162E3D] font-medium"
                    />
                    <User className="w-4 h-4 text-[#5B7586] absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-[#5B7586] mt-1">
                    Standard shift: <span className="font-semibold text-[#162E3D]">9:30 AM – 6:30 PM</span>. Logins after 10:30 AM are marked Late.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] uppercase tracking-wider mb-1.5">
                    Portal Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={employeePassword}
                      onChange={(e) => setEmployeePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F9F7]/60 border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] focus:border-transparent text-[#162E3D]"
                    />
                    <Lock className="w-4 h-4 text-[#5B7586] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#45C512] hover:bg-[#39A90E] text-[#162E3D] font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70"
                  >
                    {loading ? "Verifying..." : "Sign In to Employee Portal"}
                    <ArrowRight className="w-4 h-4 text-[#162E3D] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <p className="text-[11px] text-center text-[#5B7586]">
                  🔒 Official Attendance: Check-in timestamped and audited for HR compliance.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Visiting Card Quick Shortcut */}
        <div className="mt-4 text-center">
          <a
            href="/visiting-card"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#162E3D] bg-white border border-[#DDEAE2] hover:border-[#45C512] hover:bg-[#F5F9F7] shadow-xs transition-all"
          >
            <span>📇 Official Visiting Card Generator Studio &rarr;</span>
          </a>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[#5B7586]">
          <p>&copy; 2026 B &amp; Y Technologies. Together, we&apos;ll grow your business.</p>
        </div>
      </div>
    </div>
  );
}
