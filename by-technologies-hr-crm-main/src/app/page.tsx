"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import AdminLayout from "@/components/admin/AdminLayout";
import EmployeeDashboard from "@/components/employee/EmployeeDashboard";

export default function Home() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F9F7] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <img
            src="/logo-badge.png"
            alt="B & Y Technologies Logo"
            className="w-16 h-16 rounded-full animate-pulse ring-4 ring-[#45C512]"
          />
          <div className="absolute -inset-2 rounded-full border-2 border-[#45C512] border-t-transparent animate-spin" />
        </div>
        <div className="mt-4 text-xs font-bold tracking-widest text-[#162E3D] uppercase font-serif">
          B &amp; Y TECHNOLOGIES
        </div>
        <div className="text-[10px] text-[#5B7586] mt-0.5">Loading HR CRM System...</div>
      </div>
    );
  }

  if (role === "admin") {
    return <AdminLayout />;
  }

  if (role === "employee") {
    return <EmployeeDashboard />;
  }

  return <LoginScreen />;
}
