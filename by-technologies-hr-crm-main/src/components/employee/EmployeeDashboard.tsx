"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Employee, Attendance, LeaveRequest, AttendanceStatus, LeaveType } from "@/lib/types";
import {
  Calendar,
  Clock,
  User,
  LogOut,
  Mail,
  Phone,
  Briefcase,
  Building2,
  CalendarCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Sparkles,
  Check,
  Info,
  MessageSquare,
  Bell,
  X,
} from "lucide-react";
import TeamChatSection from "@/components/chat/TeamChatSection";

export default function EmployeeDashboard() {
  const { employee, logout, switchRole } = useAuth();

  // Current time for live ticking clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Attendance & Leaves state
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat State & Unread notifications
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Poll unread chat messages for this employee
  useEffect(() => {
    if (!employee) return;
    const checkUnread = async () => {
      try {
        const res = await fetch(`/api/chat?userId=${employee.id}&countOnly=true`);
        const data = await res.json();
        if (data.success) {
          setUnreadChatCount(data.totalUnread || 0);
        }
      } catch (e) {
        // silent
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 4000);
    return () => clearInterval(interval);
  }, [employee]);

  // Today's attendance state
  const todayStr = new Date().toISOString().split("T")[0];
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [checkInNotes, setCheckInNotes] = useState("Office - Chennai Studio");
  const [attLoading, setAttLoading] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Leave Form State
  const [leaveType, setLeaveType] = useState<LeaveType>("Casual Leave");
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState<string | null>(null);
  const [leaveErrorMsg, setLeaveErrorMsg] = useState<string | null>(null);

  // Selected calendar day detail modal/card
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{
    dateStr: string;
    attendance?: Attendance;
    leave?: LeaveRequest;
  } | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!employee) return;
    try {
      setLoading(true);
      const [attRes, levRes] = await Promise.all([
        fetch(`/api/attendance?employeeId=${employee.id}`),
        fetch(`/api/leaves?employeeId=${employee.id}`),
      ]);
      const attData = await attRes.json();
      const levData = await levRes.json();

      if (attData.success) {
        setAttendanceList(attData.attendance);
        const todayRec = attData.attendance.find((a: Attendance) => a.date === todayStr);
        setTodayAttendance(todayRec || null);
      }

      if (levData.success) {
        setLeavesList(levData.leaves);
      }
    } catch (err) {
      console.error("Failed to fetch employee dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employee]);

  // Check In Handler
  const handleCheckIn = async () => {
    if (!employee || attLoading) return;
    setAttLoading(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Official login is 9:30 AM; if check-in after 10:30 AM -> mark Late, otherwise Present
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 10 || (hours === 10 && minutes > 30);
    const status: AttendanceStatus = isLate ? "Late" : "Present";

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          date: todayStr,
          status,
          checkInTime: timeStr,
          notes: checkInNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.attendance);
        fetchData();
      }
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      setAttLoading(false);
    }
  };

  // Check Out Handler
  const handleCheckOut = async () => {
    if (!employee || !todayAttendance || attLoading) return;
    setAttLoading(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          date: todayStr,
          status: todayAttendance.status,
          checkInTime: todayAttendance.checkInTime,
          checkOutTime: timeStr,
          notes: todayAttendance.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.attendance);
        fetchData();
      }
    } catch (err) {
      console.error("Check-out error:", err);
    } finally {
      setAttLoading(false);
    }
  };

  // Leave Form Submit
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLeaveSubmitting(true);
    setLeaveSuccessMsg(null);
    setLeaveErrorMsg(null);

    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          leaveType,
          fromDate,
          toDate,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLeaveSuccessMsg("Leave application submitted successfully for HR review.");
        setLeaveReason("");
        fetchData();
        setTimeout(() => setLeaveSuccessMsg(null), 4000);
      } else {
        setLeaveErrorMsg(data.error || "Failed to submit leave request.");
      }
    } catch (err: any) {
      setLeaveErrorMsg(err.message || "Network error");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Calendar Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  // Helper to check if a date is within an approved leave
  const getApprovedLeaveForDate = (dateString: string) => {
    return leavesList.find((l) => {
      if (l.status !== "Approved") return false;
      return dateString >= l.fromDate && dateString <= l.toDate;
    });
  };

  const getAttendanceForDate = (dateString: string) => {
    return attendanceList.find((a) => a.date === dateString);
  };

  if (!employee) return null;

  // Greeting based on time of day
  const hour = currentTime.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Calculate tenure
  const joinDate = new Date(employee.dateOfJoining);
  const diffMonths =
    (currentTime.getFullYear() - joinDate.getFullYear()) * 12 +
    (currentTime.getMonth() - joinDate.getMonth());
  const tenureYears = Math.floor(diffMonths / 12);
  const tenureRemainingMonths = diffMonths % 12;
  const tenureStr =
    tenureYears > 0
      ? `${tenureYears} yr ${tenureRemainingMonths} mo`
      : `${diffMonths} months`;

  return (
    <div className="min-h-screen bg-[#F5F9F7] text-[#162E3D]">
      {/* Top Navbar */}
      <header className="bg-[#162E3D] text-white px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-md border-b border-[#244254]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-badge.png"
              alt="B & Y Technologies Logo"
              className="w-10 h-10 rounded-full object-contain ring-2 ring-[#45C512] shadow-sm"
            />
            <div>
              <div className="text-sm sm:text-base font-bold tracking-wider font-serif uppercase leading-none">
                B &amp; Y TECHNOLOGIES
              </div>
              <div className="text-[10px] text-[#45C512] font-semibold tracking-wide mt-0.5">
                Employee Self-Service Portal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Team Connect Chat Button with Notification */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Team Connect</span>
              {unreadChatCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#162E3D] text-[#45C512] text-[10px] font-bold flex items-center justify-center">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Quick Switch to HR Admin */}
            <button
              onClick={() => switchRole("admin")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-[#45C512] hover:text-[#162E3D] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Switch to HR Admin</span>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-300" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-[#162E3D] text-white rounded-3xl p-6 sm:p-8 shadow-by-lg relative overflow-hidden border border-[#244254]">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-[#45C512]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[#45C512]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <img
                src="/logo-badge.png"
                alt="B & Y Logo Badge"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-contain ring-4 ring-[#45C512] shadow-md flex-shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#45C512] text-[#162E3D] uppercase tracking-wider">
                    {employee.department}
                  </span>
                  <span className="text-xs text-white/70 font-mono">
                    ID: {employee.empId}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif tracking-tight text-white">
                  Welcome to B &amp; Y Technologies, {employee.name}
                </h1>
                <p className="text-xs sm:text-sm text-white/80 mt-1 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#45C512]" />
                  <span>{employee.designation}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-[#45C512] font-medium">{greeting}!</span>
                </p>
              </div>
            </div>

            {/* Live Clock Card */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center min-w-[170px] self-stretch md:self-auto flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#45C512]">
                {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mt-0.5">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-[10px] text-white/60 mt-1">Chennai Local Time</div>
            </div>
          </div>
        </div>

        {/* Top Grid: Profile Card & Check-In/Out Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#DDEAE2]">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      employee.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        employee.name
                      )}&backgroundColor=162e3d&textColor=45c512`
                    }
                    alt={employee.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#45C512]"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-[#162E3D]">{employee.name}</h3>
                    <div className="text-xs text-[#5B7586]">{employee.designation}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EEFCD9] text-[#2c5306] border border-[#45C512]/60">
                  ● ACTIVE
                </span>
              </div>

              <div className="space-y-3 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#5B7586] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Department
                  </span>
                  <span className="font-bold text-[#162E3D] text-right">{employee.department}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#5B7586] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#162E3D]" /> Portal Login ID
                  </span>
                  <span className="font-mono font-bold text-xs bg-[#162E3D] text-[#45C512] px-2 py-0.5 rounded-md">
                    {employee.empId}
                  </span>
                </div>

                {employee.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#5B7586] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Work Email
                    </span>
                    <span className="font-medium text-[#162E3D] text-right truncate max-w-[170px]">
                      {employee.email}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[#5B7586] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </span>
                  <span className="font-medium text-[#162E3D]">{employee.phone || "—"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#5B7586] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date of Joining
                  </span>
                  <span className="font-mono text-[#162E3D]">{employee.dateOfJoining}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#DDEAE2] grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[#F5F9F7] p-2.5 rounded-xl border border-[#DDEAE2]">
                <div className="text-[10px] text-[#5B7586]">Company Tenure</div>
                <div className="font-bold text-[#162E3D] mt-0.5">{tenureStr}</div>
              </div>
              <div className="bg-[#EEF9EB] p-2.5 rounded-xl border border-[#45C512]/40">
                <div className="text-[10px] text-[#1B4332]">Leave Balance</div>
                <div className="font-bold text-[#1B4332] mt-0.5">14 Days Left</div>
              </div>
            </div>
          </div>

          {/* Check-In / Check-Out Widget (Span 2) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#DDEAE2]">
                <div>
                  <div className="text-[11px] font-bold text-[#45C512] uppercase tracking-wider bg-[#162E3D] px-2.5 py-0.5 rounded-md inline-block">
                    Daily Attendance Terminal
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[#162E3D] mt-1">
                    Today&apos;s Presence &amp; Clocking
                  </h2>
                </div>

                {/* Current Recorded Status Badge */}
                <div>
                  {todayAttendance ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        todayAttendance.checkOutTime
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-[#EEF9EB] text-[#1B4332] border border-[#45C512]/60"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {todayAttendance.checkOutTime
                        ? "Day Shift Completed"
                        : `Checked In (${todayAttendance.status})`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock3 className="w-4 h-4" />
                      Not Checked In Today
                    </span>
                  )}
                </div>
              </div>

              {/* Standard Timing Banner */}
              <div className="p-3 bg-[#EEF9EB] border border-[#45C512]/40 rounded-xl text-xs text-[#162E3D] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#45C512]" />
                  <span className="font-semibold">Official Work Hours: 09:30 AM – 06:30 PM</span>
                </div>
                <span className="text-[11px] text-[#5B7586] bg-white px-2 py-0.5 rounded-full border border-[#DDEAE2]">
                  Grace window: Check-in by 10:30 AM (after 10:30 AM is marked Late)
                </span>
              </div>

              {/* Status Summary info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-xl bg-[#F5F9F7] border border-[#DDEAE2]">
                  <div className="text-[11px] font-semibold text-[#5B7586]">Check-In Status (Login Time)</div>
                  <div className="text-lg font-bold font-mono text-[#162E3D] mt-1">
                    {todayAttendance?.checkInTime || "— — : — —"}
                  </div>
                  <div className="text-[11px] text-[#5B7586] mt-0.5">
                    {todayAttendance?.checkInTime
                      ? `Recorded as ${todayAttendance.status}`
                      : "Expected: 09:30 AM (Grace until 10:30 AM)"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F9F7] border border-[#DDEAE2]">
                  <div className="text-[11px] font-semibold text-[#5B7586]">Check-Out Status (Exit Time)</div>
                  <div className="text-lg font-bold font-mono text-[#162E3D] mt-1">
                    {todayAttendance?.checkOutTime || "— — : — —"}
                  </div>
                  <div className="text-[11px] text-[#5B7586] mt-0.5">
                    {todayAttendance?.checkOutTime
                      ? "Clocked out for the day"
                      : todayAttendance?.checkInTime
                      ? "Standard Exit: 06:30 PM (Shift active)"
                      : "Pending check-in"}
                  </div>
                </div>
              </div>

              {/* Work Location / Notes selector */}
              {!todayAttendance && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Working Location / Mode:
                  </label>
                  <select
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    className="w-full sm:w-72 px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-medium text-[#162E3D]"
                  >
                    <option value="Office - Chennai Studio">🏢 Office - Chennai Studio</option>
                    <option value="Remote / WFH">🏠 Remote / Work From Home</option>
                    <option value="Client On-Site Visit">🤝 Client On-Site Visit</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleCheckIn}
                disabled={!!todayAttendance?.checkInTime || attLoading}
                className={`flex-1 py-3.5 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                  todayAttendance?.checkInTime
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                    : "bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] cursor-pointer"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {todayAttendance?.checkInTime
                  ? `Checked In at ${todayAttendance.checkInTime}`
                  : attLoading
                  ? "Recording Check In..."
                  : "Check In Now"}
              </button>

              <button
                onClick={handleCheckOut}
                disabled={
                  !todayAttendance?.checkInTime ||
                  !!todayAttendance?.checkOutTime ||
                  attLoading
                }
                className={`flex-1 py-3.5 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                  !todayAttendance?.checkInTime || todayAttendance?.checkOutTime
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                    : "bg-[#162E3D] hover:bg-[#244254] text-white cursor-pointer"
                }`}
              >
                <Clock className="w-4 h-4 text-[#45C512]" />
                {todayAttendance?.checkOutTime
                  ? `Checked Out at ${todayAttendance.checkOutTime}`
                  : attLoading
                  ? "Recording Check Out..."
                  : "Check Out & End Day"}
              </button>
            </div>
          </div>
        </div>

        {/* Middle Section: Interactive Calendar & Leave Application */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Widget (Span 2) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#DDEAE2] shadow-by space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDEAE2]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#162E3D]" />
                <h2 className="text-base font-bold text-[#162E3D]">
                  {monthNames[month]} {year} Calendar
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] rounded-lg"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#706161]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#45C512]" /> Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Late
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Half Day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Absent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                  🌿 On Leave
                </span>{" "}
                Approved Leave
              </span>
            </div>

            {/* Calendar Grid */}
            <div className="border border-[#DDEAE2] rounded-xl overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-[#162E3D] text-white text-[11px] font-bold text-center py-2 uppercase tracking-wider">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-[#DDEAE2] bg-white">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-16 sm:h-20 bg-[#F5F9F7]/40 p-1" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                    dayNum
                  ).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;

                  const leave = getApprovedLeaveForDate(dateStr);
                  const att = getAttendanceForDate(dateStr);

                  return (
                    <div
                      key={dateStr}
                      onClick={() =>
                        setSelectedCalendarDay({
                          dateStr,
                          attendance: att,
                          leave,
                        })
                      }
                      className={`h-16 sm:h-20 p-1.5 flex flex-col justify-between transition-colors cursor-pointer hover:bg-[#F5F9F7] relative ${
                        isToday ? "bg-[#45C512]/15 ring-2 ring-inset ring-[#45C512]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? "bg-[#162E3D] text-[#45C512]"
                              : "text-[#162E3D]"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-extrabold uppercase text-[#2c5306] hidden sm:inline">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="space-y-0.5 overflow-hidden">
                        {leave ? (
                          <div className="text-[10px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold truncate">
                            🌿 {leave.leaveType.split(" ")[0]}
                          </div>
                        ) : att ? (
                          <div
                            className={`text-[9px] px-1 py-0.2 rounded font-bold truncate flex items-center gap-1 ${
                              att.status === "Present"
                                ? "bg-[#EEFCD9] text-[#2c5306]"
                                : att.status === "Late"
                                ? "bg-amber-100 text-amber-800"
                                : att.status === "Half day"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                att.status === "Present"
                                  ? "bg-[#3c7809]"
                                  : att.status === "Late"
                                  ? "bg-amber-500"
                                  : att.status === "Half day"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="hidden sm:inline">{att.status}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details Card (if clicked) */}
            {selectedCalendarDay && (
              <div className="p-3 bg-[#F5F9F7] rounded-xl border border-[#DDEAE2] text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#162E3D]">
                    Details for {selectedCalendarDay.dateStr}:
                  </span>{" "}
                  {selectedCalendarDay.leave ? (
                    <span className="text-emerald-700 font-semibold ml-2">
                      🌿 Approved Leave: {selectedCalendarDay.leave.leaveType} (
                      {selectedCalendarDay.leave.reason})
                    </span>
                  ) : selectedCalendarDay.attendance ? (
                    <span className="text-[#162E3D] ml-2">
                      Status: <strong>{selectedCalendarDay.attendance.status}</strong> | In:{" "}
                      {selectedCalendarDay.attendance.checkInTime || "—"} | Out:{" "}
                      {selectedCalendarDay.attendance.checkOutTime || "—"}
                    </span>
                  ) : (
                    <span className="text-[#706161] ml-2">No special log for this date.</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCalendarDay(null)}
                  className="text-xs text-[#706161] hover:text-[#162E3D] font-bold"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Leave Application Form */}
          <div className="bg-white p-6 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-[#DDEAE2]">
                <CalendarOff className="w-5 h-5 text-[#162E3D]" />
                <h2 className="text-base font-bold text-[#162E3D]">Apply for Leave</h2>
              </div>

              {leaveSuccessMsg && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{leaveSuccessMsg}</span>
                </div>
              )}

              {leaveErrorMsg && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{leaveErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleApplyLeave} className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block font-bold text-[#162E3D] mb-1">Leave Type *</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    className="w-full px-3 py-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Paid Time Off">Paid Time Off (PTO)</option>
                    <option value="Half Day Leave">Half Day Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#162E3D] mb-1">From Date *</label>
                    <input
                      type="date"
                      required
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#162E3D] mb-1">To Date *</label>
                    <input
                      type="date"
                      required
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#162E3D] mb-1">Reason *</label>
                  <textarea
                    rows={3}
                    required
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Provide reason for leave..."
                    className="w-full px-3 py-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={leaveSubmitting}
                    className="w-full py-2.5 px-4 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {leaveSubmitting ? "Submitting Request..." : "Submit Leave Application"}
                  </button>
                </div>
              </form>
            </div>

            <div className="text-[11px] text-[#706161] bg-[#F5F9F7] p-3 rounded-xl border border-[#DDEAE2] mt-4">
              ℹ️ HR Administration will review your application. Once approved, the leave dates are automatically marked on your calendar.
            </div>
          </div>
        </div>

        {/* Bottom Section: My Leave History & Recent Attendance History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Leave History */}
          <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by overflow-hidden">
            <div className="p-4 bg-[#162E3D] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif uppercase tracking-wider">
                My Leave History
              </h3>
              <span className="text-[11px] text-[#45C512]">
                {leavesList.length} Requests
              </span>
            </div>

            <div className="divide-y divide-[#DDEAE2] max-h-72 overflow-y-auto">
              {leavesList.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#706161]">
                  No leave applications submitted yet.
                </div>
              ) : (
                leavesList.map((leave) => (
                  <div key={leave.id} className="p-4 hover:bg-[#F5F9F7] transition-colors text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#162E3D]">{leave.leaveType}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          leave.status === "Approved"
                            ? "bg-[#EEFCD9] text-[#2c5306] border border-[#45C512]/60"
                            : leave.status === "Pending"
                            ? "bg-amber-50 text-amber-800 border border-amber-300"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>
                    <div className="text-[#706161] text-[11px] mb-1">
                      {leave.fromDate} to {leave.toDate} ({leave.days}{" "}
                      {leave.days === 1 ? "day" : "days"})
                    </div>
                    <p className="text-[#162E3D] italic">&ldquo;{leave.reason}&rdquo;</p>
                    {leave.reviewNote && (
                      <div className="mt-1 text-[10px] text-[#2c5306] bg-[#EEFCD9]/60 px-2 py-1 rounded">
                        HR Remark: {leave.reviewNote}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Attendance History */}
          <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by overflow-hidden">
            <div className="p-4 bg-[#162E3D] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif uppercase tracking-wider">
                Recent Attendance History
              </h3>
              <span className="text-[11px] text-[#45C512]">
                {attendanceList.length} Records
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-[#162E3D]">
                <thead className="bg-[#F5F9F7] text-[#607274] text-[10px] uppercase font-bold border-b border-[#DDEAE2]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Check-In</th>
                    <th className="py-2.5 px-3">Check-Out</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDEAE2]">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-xs text-[#706161]">
                        No attendance recorded yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.slice(0, 15).map((att) => (
                      <tr key={att.id} className="hover:bg-[#F5F9F7]/70">
                        <td className="py-2.5 px-3 font-mono font-medium">
                          {att.date}
                          {att.date === todayStr && (
                            <span className="ml-1 text-[9px] px-1 bg-[#45C512] text-[#162E3D] rounded font-bold">
                              TODAY
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {att.checkInTime || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {att.checkOutTime || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              att.status === "Present"
                                ? "bg-[#EEFCD9] text-[#2c5306]"
                                : att.status === "Late"
                                ? "bg-amber-50 text-amber-800"
                                : att.status === "Half day"
                                ? "bg-orange-50 text-orange-800"
                                : "bg-red-50 text-red-800"
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button for Team Connect */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setChatOpen(true)}
          className="relative group p-4 rounded-full bg-[#162E3D] text-[#45C512] hover:bg-[#244254] shadow-2xl border-2 border-[#45C512] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Open Team Connect Chat"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#45C512] text-[#162E3D] font-bold text-[11px] rounded-full flex items-center justify-center shadow-md animate-bounce">
              {unreadChatCount}
            </span>
          )}
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 text-xs font-bold text-[#45C512] transition-all duration-300">
            Team Connect
          </span>
        </button>
      </div>

      {/* Team Chat Modal / Drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#DDEAE2] shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="bg-[#162E3D] text-white p-4 flex items-center justify-between border-b border-[#244254]">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-badge.png"
                  alt="B & Y Technologies Logo"
                  className="w-8 h-8 rounded-full object-contain ring-2 ring-[#45C512]"
                />
                <div>
                  <h3 className="text-sm font-bold font-serif uppercase tracking-wider text-white">
                    Team Connect &bull; Agency Chat
                  </h3>
                  <p className="text-[10px] text-gray-300">
                    Logged in as {employee.name} ({employee.empId}) &bull; {employee.designation}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden">
              <TeamChatSection
                currentUser={{
                  id: employee.id,
                  name: employee.name,
                  role: "employee",
                  designation: employee.designation,
                  avatarUrl: employee.avatarUrl,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
