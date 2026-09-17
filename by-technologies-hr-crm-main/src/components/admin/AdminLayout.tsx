"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  Clock,
  CalendarOff,
  History,
  Briefcase,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Shield,
  UserCheck,
  FolderArchive,
  MessageSquare,
  Bell,
  CreditCard,
} from "lucide-react";
import EmployeeRecordsSection from "./EmployeeRecordsSection";
import AttendanceSection from "./AttendanceSection";
import HRWorkspaceSection from "./HRWorkspaceSection";
import TeamChatSection from "@/components/chat/TeamChatSection";
import LeaveAbsenceSection from "./LeaveAbsenceSection";
import LoginTimesSection from "./LoginTimesSection";
import RecruitmentSection from "./RecruitmentSection";
import VisitingCardSection from "./VisitingCardSection";
import { Employee } from "@/lib/types";

export type AdminSection =
  | "employees"
  | "attendance"
  | "workspace"
  | "visiting-cards"
  | "chat"
  | "leaves"
  | "logins"
  | "recruitment";

export default function AdminLayout() {
  const { adminName, logout, switchRole } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("employees");
  const [visitingCardEmployee, setVisitingCardEmployee] = useState<Employee | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Poll for unread admin messages
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await fetch("/api/chat?userId=admin&countOnly=true");
        const data = await res.json();
        if (data.success) {
          setUnreadChatCount(data.totalUnread || 0);
        }
      } catch (e) {
        // silent
      }
    };
    checkUnread();
    const timer = setInterval(checkUnread, 4000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    {
      id: "employees" as AdminSection,
      label: "Employee records",
      icon: Users,
      badge: "CRUD",
    },
    {
      id: "attendance" as AdminSection,
      label: "Attendance & Calendar",
      icon: Clock,
      badge: "Matrix",
    },
    {
      id: "workspace" as AdminSection,
      label: "HR Workspace & Vault",
      icon: FolderArchive,
      badge: "Excel/Word",
    },
    {
      id: "visiting-cards" as AdminSection,
      label: "Visiting Cards",
      icon: CreditCard,
      badge: "Studio",
    },
    {
      id: "chat" as AdminSection,
      label: "Team Connect",
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? `${unreadChatCount} new` : "Chat",
      highlight: unreadChatCount > 0,
    },
    {
      id: "leaves" as AdminSection,
      label: "Leave & absence",
      icon: CalendarOff,
      badge: "Approvals",
    },
    {
      id: "logins" as AdminSection,
      label: "Login times",
      icon: History,
      badge: "Audit Log",
    },
    {
      id: "recruitment" as AdminSection,
      label: "Recruitment",
      icon: Briefcase,
      badge: "Openings",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F9F7] flex flex-col md:flex-row text-[#162E3D]">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#162E3D] text-white border-b border-[#244254] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src="/logo-badge.png"
            alt="B & Y Logo"
            className="w-8 h-8 rounded-full object-contain ring-2 ring-[#45C512]"
          />
          <div>
            <div className="text-sm font-bold tracking-wider font-serif uppercase">
              B &amp; Y TECHNOLOGIES
            </div>
            <div className="text-[10px] text-[#45C512] font-semibold">HR Admin Portal</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#162E3D] text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#244254]">
          <div className="flex items-center gap-3">
            {/* Circular badge with vibrant green ring */}
            <div className="relative flex-shrink-0">
              <img
                src="/logo-badge.png"
                alt="B & Y Technologies Logo"
                className="w-12 h-12 rounded-full object-contain ring-2 ring-[#45C512] shadow-md bg-white p-0.5"
              />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold tracking-wider text-white font-serif uppercase truncate">
                B &amp; Y TECHNOLOGIES
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#45C512]">
                <Shield className="w-3 h-3" /> HR Admin Portal
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[#8299A8] leading-tight">
            Digital Marketing Agency • People Operations
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-[#8299A8] uppercase">
            Management Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#45C512] text-[#162E3D] shadow-sm font-bold"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#162E3D]" : "text-[#45C512]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? "bg-[#162E3D] text-[#45C512]"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Demo Switcher & Admin Footer */}
        <div className="p-3 border-t border-[#244254] bg-[#0F1E28] space-y-2.5">
          <div className="bg-[#162E3D] p-2.5 rounded-xl border border-[#244254]">
            <div className="text-[10px] font-bold text-[#45C512] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Quick Switch to Employee View:
            </div>
            <button
              onClick={() => switchRole("employee", "emp_1")}
              className="w-full py-1.5 px-2 bg-white/10 hover:bg-[#45C512] hover:text-[#162E3D] text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-between cursor-pointer"
            >
              <span>👤 View as Priya (SEO Lead)</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 px-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#45C512] text-[#162E3D] font-bold text-xs flex items-center justify-center font-serif">
                HR
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">
                  {adminName || "HR Admin"}
                </div>
                <div className="text-[10px] text-[#8299A8]">Super Administrator</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-[#DDEAE2] sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-serif text-[#162E3D] tracking-tight">
              {navItems.find((n) => n.id === activeSection)?.label}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF9EB] text-[#1B4332] font-bold border border-[#45C512]/40">
              B &amp; Y Technologies HR Suite
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Team Chat Header Button */}
            <button
              onClick={() => setActiveSection("chat")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeSection === "chat"
                  ? "bg-[#162E3D] text-[#45C512] border-[#162E3D]"
                  : "bg-[#F5F9F7] text-[#162E3D] border-[#DDEAE2] hover:bg-[#DDEAE2]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#45C512]" />
              <span>Team Connect</span>
              {unreadChatCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#45C512] text-[#162E3D] text-[10px] font-bold flex items-center justify-center">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Quick HR Vault Button */}
            <button
              onClick={() => setActiveSection("workspace")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeSection === "workspace"
                  ? "bg-[#162E3D] text-[#45C512] border-[#162E3D]"
                  : "bg-[#F5F9F7] text-[#162E3D] border-[#DDEAE2] hover:bg-[#DDEAE2]"
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
              <span>HR Vault</span>
            </button>

            {/* Quick Visiting Cards Studio Button */}
            <button
              onClick={() => {
                setVisitingCardEmployee(null);
                setActiveSection("visiting-cards");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeSection === "visiting-cards"
                  ? "bg-[#162E3D] text-[#45C512] border-[#162E3D]"
                  : "bg-[#F5F9F7] text-[#162E3D] border-[#DDEAE2] hover:bg-[#DDEAE2]"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-[#45C512]" />
              <span>Visiting Cards</span>
            </button>

            <div className="h-6 w-px bg-[#DDEAE2]" />
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Section Content */}
        <div className="p-4 sm:p-6 md:p-8 flex-1">
          {activeSection === "employees" && (
            <EmployeeRecordsSection
              onSelectVisitingCard={(emp) => {
                setVisitingCardEmployee(emp);
                setActiveSection("visiting-cards");
              }}
            />
          )}
          {activeSection === "attendance" && <AttendanceSection />}
          {activeSection === "workspace" && <HRWorkspaceSection />}
          {activeSection === "visiting-cards" && (
            <VisitingCardSection
              initialEmployee={visitingCardEmployee}
              onBackToRecords={() => setActiveSection("employees")}
            />
          )}
          {activeSection === "chat" && (
            <TeamChatSection
              currentUser={{
                id: "admin",
                name: adminName || "HR Admin",
                role: "admin",
                designation: "HR Administration",
              }}
            />
          )}
          {activeSection === "leaves" && <LeaveAbsenceSection />}
          {activeSection === "logins" && <LoginTimesSection />}
          {activeSection === "recruitment" && <RecruitmentSection />}
        </div>
      </main>
    </div>
  );
}
