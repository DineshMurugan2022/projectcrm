"use client";

import React, { useState, useEffect } from "react";
import {
  Employee,
  Attendance,
  AttendanceStatus,
  WorkType,
  AttendanceTeam,
  ATTENDANCE_TEAMS,
  getAttendanceTeam,
} from "@/lib/types";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  UserX,
  Search,
  CheckCheck,
  Save,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Table,
  Folder,
  FolderArchive,
  FolderDown,
  FolderCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  CalendarDays,
  ListFilter,
  Edit3,
  X,
  Laptop,
  Building2,
  MapPin,
  Sparkles,
  Users,
  Layers,
  PlusCircle,
} from "lucide-react";

export default function AttendanceSection() {
  // Navigation / View Tabs
  const [viewMode, setViewMode] = useState<"daily" | "monthly-matrix" | "employee-calendar">(
    "monthly-matrix"
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [reportMonth, setReportMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // YYYY-MM
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [monthAttendanceRecords, setMonthAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);

  // Saved Folder Reports State
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [folderBase, setFolderBase] = useState<string>("./reports/attendance");
  const [isSavingToFolder, setIsSavingToFolder] = useState(false);
  const [showFolderViewer, setShowFolderViewer] = useState(false);
  const [folderMsg, setFolderMsg] = useState<string | null>(null);

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("All");
  const [calendarEmpId, setCalendarEmpId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [groupByTeam, setGroupByTeam] = useState<boolean>(true);

  // Local editing state for Daily Roster table
  const [editState, setEditState] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        workType?: WorkType;
        checkInTime: string;
        checkOutTime: string;
        notes: string;
        isSaved: boolean;
      }
    >
  >({});

  const [savingId, setSavingId] = useState<string | null>(null);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  // EDIT MODAL STATE
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalEmployee, setModalEmployee] = useState<Employee | null>(null);
  const [modalDate, setModalDate] = useState<string>("");
  const [modalStatus, setModalStatus] = useState<AttendanceStatus>("Present");
  const [modalWorkType, setModalWorkType] = useState<WorkType>("Office");
  const [modalCheckIn, setModalCheckIn] = useState<string>("");
  const [modalCheckOut, setModalCheckOut] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [modalSaving, setModalSaving] = useState(false);

  // Fetch Daily Attendance
  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes] = await Promise.all([
        fetch("/api/employees"),
        fetch(`/api/attendance?date=${selectedDate}`),
      ]);
      const empData = await empRes.json();
      const attData = await attRes.json();

      if (empData.success) {
        let empList: Employee[] = empData.employees;
        try {
          const raw = localStorage.getItem("byt_deleted_emp_ids");
          if (raw) {
            const deletedIds: string[] = JSON.parse(raw);
            empList = empList.filter(
              (e) => !deletedIds.includes(e.id) && !deletedIds.includes(e.empId)
            );
          }
        } catch (e) {
          // ignore
        }
        setEmployees(empList);
        if (!calendarEmpId && empList.length > 0) {
          setCalendarEmpId(empList[0].id);
        }
      }
      if (attData.success) {
        setAttendanceRecords(attData.attendance);

        // Build editState map
        const stateMap: Record<string, any> = {};
        empData.employees.forEach((emp: Employee) => {
          const record = attData.attendance.find(
            (a: Attendance) => a.employeeId === emp.id
          );
          stateMap[emp.id] = {
            status: record?.status || "Present",
            workType: record?.workType || "Office",
            checkInTime: record?.checkInTime || (record ? "" : "09:30 AM"),
            checkOutTime: record?.checkOutTime || (record ? "" : "06:30 PM"),
            notes: record?.notes || "",
            isSaved: !!record,
          };
        });
        setEditState(stateMap);
      }
    } catch (err) {
      console.error("Failed to load daily attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Monthly Attendance for Calendar & Matrix
  const fetchMonthData = async () => {
    try {
      setMonthLoading(true);
      const res = await fetch(`/api/attendance?month=${reportMonth}`);
      const data = await res.json();
      if (data.success) {
        setMonthAttendanceRecords(data.attendance || []);
      }
    } catch (err) {
      console.error("Failed to load month attendance:", err);
    } finally {
      setMonthLoading(false);
    }
  };

  const fetchSavedReports = async () => {
    try {
      const res = await fetch("/api/attendance/reports");
      const data = await res.json();
      if (data.success) {
        setSavedReports(data.reports || []);
        if (data.baseFolder) setFolderBase(data.baseFolder);
      }
    } catch (err) {
      console.error("Failed to load saved reports:", err);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthData();
  }, [reportMonth]);

  useEffect(() => {
    fetchSavedReports();
  }, []);

  const handleSaveToFolder = async (format: "excel" | "csv" = "excel") => {
    setIsSavingToFolder(true);
    setFolderMsg(null);
    try {
      const res = await fetch("/api/attendance/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: reportMonth, format }),
      });
      const data = await res.json();
      if (data.success) {
        setFolderMsg(
          `Streamed & saved to folder: ${data.report.relativePath} (${data.report.sizeFormatted})`
        );
        fetchSavedReports();
        setShowFolderViewer(true);
        setTimeout(() => setFolderMsg(null), 6000);
      } else {
        setFolderMsg(`Error: ${data.error || "Failed to save"}`);
      }
    } catch (err) {
      setFolderMsg("Failed to connect to server stream handler.");
    } finally {
      setIsSavingToFolder(false);
    }
  };

  const handleDeleteSavedReport = async (relativePath: string) => {
    try {
      const res = await fetch(
        `/api/attendance/reports?file=${encodeURIComponent(relativePath)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        fetchSavedReports();
      }
    } catch (err) {
      console.error("Delete report error:", err);
    }
  };

  const handleFieldChange = (
    empId: string,
    field: "status" | "workType" | "checkInTime" | "checkOutTime" | "notes",
    val: any
  ) => {
    setEditState((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: val,
        isSaved: false,
      },
    }));
  };

  const handleSaveRow = async (empId: string) => {
    const row = editState[empId];
    if (!row) return;

    setSavingId(empId);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          date: selectedDate,
          status: row.status,
          workType: row.workType,
          checkInTime: row.checkInTime,
          checkOutTime: row.checkOutTime,
          notes: row.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditState((prev) => ({
          ...prev,
          [empId]: { ...prev[empId], isSaved: true },
        }));
        const updatedList = attendanceRecords.filter((a) => a.employeeId !== empId);
        setAttendanceRecords([...updatedList, data.attendance]);
        fetchMonthData();
      }
    } catch (err) {
      console.error("Save attendance error:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-all-present",
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchSuccessMsg(data.message || "Marked active staff present");
        fetchDailyData();
        fetchMonthData();
        setTimeout(() => setBatchSuccessMsg(null), 3500);
      }
    } catch (err) {
      console.error("Batch mark error:", err);
    }
  };

  const handleDownloadReport = (format: "excel" | "csv") => {
    const url = `/api/attendance/export?month=${reportMonth}&format=${format}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `BY_Technologies_Attendance_${reportMonth}.${format === "excel" ? "xls" : "csv"}`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // OPEN EDIT MODAL FOR A SPECIFIC EMPLOYEE AND DATE
  const handleOpenEditModal = (emp: Employee, dateStr: string) => {
    setModalEmployee(emp);
    setModalDate(dateStr);

    const existing =
      monthAttendanceRecords.find(
        (r) => r.employeeId === emp.id && r.date === dateStr
      ) ||
      attendanceRecords.find(
        (r) => r.employeeId === emp.id && r.date === dateStr
      );

    if (existing) {
      setModalStatus(existing.status);
      setModalWorkType(existing.workType || "Office");
      setModalCheckIn(existing.checkInTime || "");
      setModalCheckOut(existing.checkOutTime || "");
      setModalNotes(existing.notes || "");
    } else {
      setModalStatus("Present");
      setModalWorkType("Office");
      setModalCheckIn("09:30 AM");
      setModalCheckOut("06:30 PM");
      setModalNotes("");
    }

    setEditModalOpen(true);
  };

  // SAVE FROM EDIT MODAL
  const handleSaveModal = async () => {
    if (!modalEmployee || !modalDate) return;
    setModalSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: modalEmployee.id,
          date: modalDate,
          status: modalStatus,
          workType: modalWorkType,
          checkInTime: modalCheckIn,
          checkOutTime: modalCheckOut,
          notes: modalNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedMonth = monthAttendanceRecords.filter(
          (r) => !(r.employeeId === modalEmployee.id && r.date === modalDate)
        );
        setMonthAttendanceRecords([...updatedMonth, data.attendance]);

        if (modalDate === selectedDate) {
          const updatedDaily = attendanceRecords.filter(
            (r) => r.employeeId !== modalEmployee.id
          );
          setAttendanceRecords([...updatedDaily, data.attendance]);
          setEditState((prev) => ({
            ...prev,
            [modalEmployee.id]: {
              status: data.attendance.status,
              workType: data.attendance.workType,
              checkInTime: data.attendance.checkInTime || "",
              checkOutTime: data.attendance.checkOutTime || "",
              notes: data.attendance.notes || "",
              isSaved: true,
            },
          }));
        }

        setEditModalOpen(false);
      }
    } catch (err) {
      console.error("Modal save error:", err);
    } finally {
      setModalSaving(false);
    }
  };

  // QUICK PRESET BUTTON HANDLER
  const applyPreset = (preset: {
    status: AttendanceStatus;
    workType: WorkType;
    inTime: string;
    outTime: string;
    notes?: string;
  }) => {
    setModalStatus(preset.status);
    setModalWorkType(preset.workType);
    setModalCheckIn(preset.inTime);
    setModalCheckOut(preset.outTime);
    if (preset.notes !== undefined) setModalNotes(preset.notes);
  };

  // Team badge styling helper
  const getTeamBadgeStyle = (team: AttendanceTeam) => {
    switch (team) {
      case "Sales":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Marketing":
        return "bg-teal-50 text-teal-800 border-teal-200";
      case "Technical":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Management":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Support":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Human Resource":
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-gray-50 text-gray-800 border-gray-200";
    }
  };

  // Daily Stats for selectedDate
  const totalActiveStaff = employees.filter((e) => e.status === "active").length;
  const presentCount = attendanceRecords.filter((a) => a.status === "Present").length;
  const lateCount = attendanceRecords.filter((a) => a.status === "Late").length;
  const halfDayCount = attendanceRecords.filter((a) => a.status === "Half day").length;
  const absentCount = attendanceRecords.filter((a) => a.status === "Absent").length;

  // Team counts across all employees
  const teamCounts = ATTENDANCE_TEAMS.reduce((acc, t) => {
    acc[t] = employees.filter((e) => getAttendanceTeam(e) === t).length;
    return acc;
  }, {} as Record<AttendanceTeam, number>);

  // Filter employees for daily roster
  const filteredEmployees = employees.filter((emp) => {
    const matchesEmp =
      selectedEmployeeId === "All" || emp.id === selectedEmployeeId;
    const rowState = editState[emp.id];
    const currentStatus = rowState ? rowState.status : "Present";
    const matchesStatus =
      selectedStatus === "All" || currentStatus === selectedStatus;
    const empTeam = getAttendanceTeam(emp);
    const matchesTeam =
      selectedTeam === "All" || empTeam === selectedTeam;
    return matchesEmp && matchesStatus && matchesTeam;
  });

  // Calculate calendar days in selected reportMonth (YYYY-MM)
  const [yearNum, monthNum] = reportMonth.split("-").map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const dayIndices = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Month navigation helper
  const navigateMonth = (direction: -1 | 1) => {
    const current = new Date(yearNum, monthNum - 1 + direction, 1);
    const newMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    setReportMonth(newMonth);
  };

  // Month attendance map: key = `${employeeId}_${date}`
  const monthMap = new Map<string, Attendance>();
  monthAttendanceRecords.forEach((att) => {
    monthMap.set(`${att.employeeId}_${att.date}`, att);
  });

  return (
    <div className="space-y-6">
      {/* Monthly Attendance Report Excel Stream Card for HR */}
      <div className="bg-[#162E3D] text-white p-5 rounded-2xl shadow-by-lg border border-[#244254] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#45C512] text-[#162E3D] flex items-center justify-center font-bold shadow-md flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-serif tracking-tight text-white">
                Monthly Attendance Stream &amp; Matrix
              </h2>
              <span className="text-[10px] bg-[#45C512] text-[#162E3D] font-bold px-2 py-0.5 rounded-full uppercase">
                Interactive + Excel
              </span>
            </div>
            <p className="text-xs text-[#8299A8] mt-0.5">
              Full month-wise matrix, individual calendar view, click-to-edit shift types, and Excel streams.
            </p>
          </div>
        </div>

        {/* Month Selector & Download Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-[#0F1E28] px-3 py-2 rounded-xl border border-[#244254]">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <Calendar className="w-4 h-4 text-[#45C512]" />
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => navigateMonth(1)}
              className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => handleDownloadReport("excel")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            title="Download formatted multi-sheet Excel spreadsheet"
          >
            <Download className="w-4 h-4" />
            Excel (.xls)
          </button>

          <button
            onClick={() => handleDownloadReport("csv")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 transition-all cursor-pointer"
            title="Download UTF-8 CSV Stream"
          >
            <Table className="w-3.5 h-3.5 text-[#45C512]" />
            CSV
          </button>

          {/* SAVE STREAM TO FOLDER BUTTON */}
          <button
            onClick={() => handleSaveToFolder("excel")}
            disabled={isSavingToFolder}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              isSavingToFolder
                ? "bg-[#45C512]/30 text-white border-[#45C512]/40 cursor-wait"
                : "bg-[#0F1E28] hover:bg-[#1C3A4D] text-[#45C512] border-[#45C512]/40 shadow-sm"
            }`}
            title="Stream and save directly into server folder ./reports/attendance/YYYY-MM/"
          >
            <FolderDown className="w-4 h-4" />
            {isSavingToFolder ? "Saving..." : "Save to Folder"}
          </button>

          {/* TOGGLE FOLDER ARCHIVE VIEW */}
          <button
            onClick={() => setShowFolderViewer(!showFolderViewer)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showFolderViewer
                ? "bg-white text-[#162E3D] border-white"
                : "bg-white/10 hover:bg-white/20 text-white border-white/15"
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-[#45C512]" />
            <span>Vault ({savedReports.length})</span>
            {showFolderViewer ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* FOLDER SAVE STATUS NOTIFICATION */}
      {folderMsg && (
        <div className="bg-[#EEF9EB] border border-[#45C512] text-[#1B4332] p-3.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <FolderCheck className="w-4 h-4 text-[#2c5306] flex-shrink-0" />
            <span>{folderMsg}</span>
          </div>
          <button
            onClick={() => setFolderMsg(null)}
            className="text-[#2c5306] hover:text-[#1B4332] text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* SAVED FOLDER REPORTS ARCHIVE VIEWER */}
      {showFolderViewer && (
        <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#DDEAE2] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#162E3D] text-[#45C512] flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#162E3D]">Server Storage Folder Archive</h3>
                <p className="text-[11px] text-[#5B7586]">
                  Directory: <code className="bg-[#F5F9F7] px-1.5 py-0.5 rounded text-[#162E3D] font-mono">{folderBase}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveToFolder("csv")}
                className="text-xs px-2.5 py-1.5 bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] border border-[#DDEAE2] rounded-lg font-medium transition-colors cursor-pointer"
              >
                + Save CSV Stream
              </button>
              <button
                onClick={fetchSavedReports}
                title="Refresh folder contents"
                className="p-1.5 text-[#5B7586] hover:text-[#162E3D] hover:bg-[#F5F9F7] rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {savedReports.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#5B7586]">
              <Folder className="w-8 h-8 text-[#8299A8] mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-[#162E3D]">No reports saved to folder yet</p>
              <p className="mt-1">
                Click <span className="font-bold text-[#162E3D]">"Save to Folder"</span> above to archive the monthly report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F9F7] text-[#5B7586] border-b border-[#DDEAE2]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Month</th>
                    <th className="py-2.5 px-3 font-semibold">Report File</th>
                    <th className="py-2.5 px-3 font-semibold">Format</th>
                    <th className="py-2.5 px-3 font-semibold">Folder Path</th>
                    <th className="py-2.5 px-3 font-semibold">File Size</th>
                    <th className="py-2.5 px-3 font-semibold">Generated</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDEAE2]">
                  {savedReports.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F9F7]/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#162E3D]">
                        <span className="px-2 py-0.5 rounded bg-[#162E3D] text-[#45C512] text-[10px] font-mono">
                          {rep.month}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#162E3D]">
                        <div className="flex items-center gap-1.5">
                          {rep.format === "excel" ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Table className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          )}
                          <span className="font-mono text-[11px] truncate max-w-xs">{rep.fileName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rep.format === "excel"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {rep.format === "excel" ? "Excel .xls" : "CSV"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#5B7586] font-mono text-[11px]">
                        {rep.relativePath}
                      </td>
                      <td className="py-2.5 px-3 text-[#162E3D] font-semibold">
                        {rep.sizeFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-[#5B7586]">
                        {new Date(rep.createdAt).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={rep.downloadUrl}
                            download={rep.fileName}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Stream and download directly"
                          >
                            <Download className="w-3 h-3" />
                            Stream
                          </a>
                          <button
                            onClick={() => handleDeleteSavedReport(rep.relativePath)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-[#DDEAE2] shadow-by">
        <div className="flex items-center gap-1.5 bg-[#F5F9F7] p-1 rounded-xl border border-[#DDEAE2]">
          <button
            onClick={() => setViewMode("monthly-matrix")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "monthly-matrix"
                ? "bg-[#162E3D] text-[#45C512] shadow-sm"
                : "text-[#5B7586] hover:text-[#162E3D]"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Monthly Matrix (All Staff)</span>
          </button>

          <button
            onClick={() => setViewMode("employee-calendar")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "employee-calendar"
                ? "bg-[#162E3D] text-[#45C512] shadow-sm"
                : "text-[#5B7586] hover:text-[#162E3D]"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Employee Calendar View</span>
          </button>

          <button
            onClick={() => setViewMode("daily")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "daily"
                ? "bg-[#162E3D] text-[#45C512] shadow-sm"
                : "text-[#5B7586] hover:text-[#162E3D]"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Daily Roster Table</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#5B7586] pr-2">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Present (P)
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Late (L)
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> Half Day (HD)
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Absent (A)
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Leave (LV)
          </span>
        </div>
      </div>

      {/* TEAM SEGREGATION BAR (IN ATTENDANCE SECTION ALONE) */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#45C512]" />
          <span className="text-xs font-bold text-[#162E3D]">Team Segregation:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedTeam("All")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTeam === "All"
                ? "bg-[#162E3D] text-[#45C512] shadow-sm"
                : "bg-[#F5F9F7] text-[#5B7586] hover:text-[#162E3D] border border-[#DDEAE2]"
            }`}
          >
            All Teams ({employees.length})
          </button>
          {ATTENDANCE_TEAMS.map((team) => {
            const count = teamCounts[team] || 0;
            const isSelected = selectedTeam === team;
            return (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#162E3D] text-white shadow-sm ring-2 ring-[#45C512]"
                    : `${getTeamBadgeStyle(team)} hover:opacity-90`
                }`}
              >
                <span>{team}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-[#45C512] text-[#162E3D]" : "bg-black/10"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByTeam(!groupByTeam)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              groupByTeam
                ? "bg-[#EEF9EB] text-[#2c5306] border-[#45C512]/60"
                : "bg-[#F5F9F7] text-[#5B7586] border-[#DDEAE2]"
            }`}
            title="Toggle grouping rows under team sections"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Group by Team: {groupByTeam ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MONTHLY MATRIX VIEW (ALL 14 EMPLOYEES X DAYS 1..31) */}
      {/* ========================================================================= */}
      {viewMode === "monthly-matrix" && (
        <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#DDEAE2] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#162E3D]">
                  Monthly Attendance Matrix &mdash; {new Date(yearNum, monthNum - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <span className="text-[11px] px-2 py-0.5 bg-[#EEF9EB] text-[#1B4332] font-bold rounded-full">
                  Click any cell to edit type
                </span>
              </div>
              <p className="text-xs text-[#5B7586] mt-0.5">
                Complete overview across agency teams with instant shift/type modifications and check-in times.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchMonthData}
                disabled={monthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] rounded-xl font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${monthLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* MATRIX TABLE */}
          <div className="overflow-x-auto border border-[#DDEAE2] rounded-xl shadow-inner max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-[#162E3D] text-white sticky top-0 z-20">
                <tr>
                  <th className="py-3 px-3 text-left font-bold min-w-[220px] sticky left-0 bg-[#162E3D] z-30 shadow-md">
                    Employee &amp; Team
                  </th>
                  {dayIndices.map((day) => {
                    const dateObj = new Date(yearNum, monthNum - 1, day);
                    const dayOfWeek = dateObj.getDay();
                    const isSunday = dayOfWeek === 0;
                    return (
                      <th
                        key={day}
                        className={`py-2 px-1 min-w-[34px] font-mono text-[10px] border-l border-[#244254] ${
                          isSunday ? "bg-[#244254] text-rose-300 font-bold" : ""
                        }`}
                        title={`${dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
                      >
                        <div>{day}</div>
                        <div className="text-[8px] opacity-75">
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dayOfWeek]}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-2 font-bold min-w-[50px] bg-[#0F1E28] text-[#45C512]">P</th>
                  <th className="py-3 px-2 font-bold min-w-[50px] bg-[#0F1E28] text-amber-300">L</th>
                  <th className="py-3 px-2 font-bold min-w-[50px] bg-[#0F1E28] text-orange-300">HD</th>
                  <th className="py-3 px-2 font-bold min-w-[50px] bg-[#0F1E28] text-rose-300">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDEAE2]">
                {(() => {
                  const matrixEmployees = employees.filter((emp) => {
                    const matchesEmp = selectedEmployeeId === "All" || emp.id === selectedEmployeeId;
                    const matchesTeam = selectedTeam === "All" || getAttendanceTeam(emp) === selectedTeam;
                    return matchesEmp && matchesTeam;
                  });

                  if (matrixEmployees.length === 0) {
                    return (
                      <tr>
                        <td colSpan={dayIndices.length + 5} className="py-10 text-center text-xs text-[#5B7586]">
                          No employees matching the selected team/filter.
                        </td>
                      </tr>
                    );
                  }

                  return matrixEmployees.map((emp) => {
                    let pTotal = 0;
                    let lTotal = 0;
                    let hdTotal = 0;
                    let aTotal = 0;
                    const empTeam = getAttendanceTeam(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-[#F5F9F7]/80 transition-colors">
                        {/* Sticky Employee column */}
                        <td className="py-2.5 px-3 text-left font-medium sticky left-0 bg-white hover:bg-[#F5F9F7] z-10 shadow-sm border-r border-[#DDEAE2]">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                emp.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.name)}&backgroundColor=162e3d&textColor=45c512`
                              }
                              alt={emp.name}
                              className="w-7 h-7 rounded-full object-cover border border-[#DDEAE2] flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-[#162E3D] text-xs truncate flex items-center gap-1">
                                <span>{emp.name}</span>
                                <span className="text-[9px] font-mono bg-[#162E3D]/10 px-1 rounded text-[#162E3D]">
                                  {emp.empId}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-[#5B7586] truncate font-medium">
                                  {emp.designation}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${getTeamBadgeStyle(empTeam)}`}>
                                  {empTeam}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Day cells 1..31 */}
                        {dayIndices.map((day) => {
                          const dateStr = `${reportMonth}-${String(day).padStart(2, "0")}`;
                          const record = monthMap.get(`${emp.id}_${dateStr}`);
                          const dateObj = new Date(yearNum, monthNum - 1, day);
                          const isSunday = dateObj.getDay() === 0;

                          let badgeColor = "text-[#8299A8] bg-[#F5F9F7]/50 hover:bg-[#DDEAE2]";
                          let letter = isSunday ? "Sun" : "-";

                          if (record) {
                            if (record.status === "Present") {
                              badgeColor = "bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 border border-emerald-300";
                              letter = "P";
                              pTotal++;
                            } else if (record.status === "Late") {
                              badgeColor = "bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 border border-amber-300";
                              letter = "L";
                              lTotal++;
                            } else if (record.status === "Half day") {
                              badgeColor = "bg-orange-100 text-orange-800 font-bold hover:bg-orange-200 border border-orange-300";
                              letter = "HD";
                              hdTotal++;
                            } else if (record.status === "Absent") {
                              badgeColor = "bg-red-100 text-red-800 font-bold hover:bg-red-200 border border-red-300";
                              letter = "A";
                              aTotal++;
                            } else if (record.status === "On Leave") {
                              badgeColor = "bg-purple-100 text-purple-800 font-bold hover:bg-purple-200 border border-purple-300";
                              letter = "LV";
                            }
                          }

                          return (
                            <td
                              key={day}
                              onClick={() => handleOpenEditModal(emp, dateStr)}
                              className="p-1 border-l border-[#DDEAE2] cursor-pointer"
                              title={`Click to edit: ${emp.name} on ${dateStr}${record ? ` (${record.status} - ${record.checkInTime || 'No time'})` : ' (No entry)'}`}
                            >
                              <div
                                className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[10px] transition-transform hover:scale-110 active:scale-95 ${badgeColor}`}
                              >
                                {letter}
                              </div>
                            </td>
                          );
                        })}

                        {/* Row Totals */}
                        <td className="py-2.5 px-2 font-bold text-emerald-700 bg-emerald-50/40 border-l border-[#DDEAE2]">
                          {pTotal}
                        </td>
                        <td className="py-2.5 px-2 font-bold text-amber-700 bg-amber-50/40 border-l border-[#DDEAE2]">
                          {lTotal}
                        </td>
                        <td className="py-2.5 px-2 font-bold text-orange-700 bg-orange-50/40 border-l border-[#DDEAE2]">
                          {hdTotal}
                        </td>
                        <td className="py-2.5 px-2 font-bold text-red-700 bg-red-50/40 border-l border-[#DDEAE2]">
                          {aTotal}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INDIVIDUAL EMPLOYEE MONTHLY CALENDAR VIEW */}
      {/* ========================================================================= */}
      {viewMode === "employee-calendar" && (
        <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#DDEAE2] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#162E3D]">Employee Monthly Calendar</h3>
              <p className="text-xs text-[#5B7586]">
                Full monthly calendar grid for individual employee with check-in, check-out, and shift type.
              </p>
            </div>

            {/* Employee Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#162E3D]">Select Employee:</label>
              <select
                value={calendarEmpId}
                onChange={(e) => setCalendarEmpId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-bold text-[#162E3D]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.empId}) &mdash; {getAttendanceTeam(emp)} &bull; {emp.designation}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Employee Card Header */}
          {(() => {
            const currentEmp = employees.find((e) => e.id === calendarEmpId) || employees[0];
            if (!currentEmp) return null;

            const empMonthRecords = monthAttendanceRecords.filter(
              (r) => r.employeeId === currentEmp.id
            );
            const empPresent = empMonthRecords.filter((r) => r.status === "Present").length;
            const empLate = empMonthRecords.filter((r) => r.status === "Late").length;
            const empHalf = empMonthRecords.filter((r) => r.status === "Half day").length;
            const empAbsent = empMonthRecords.filter((r) => r.status === "Absent").length;
            const empLeaves = empMonthRecords.filter((r) => r.status === "On Leave").length;
            const empTeam = getAttendanceTeam(currentEmp);

            return (
              <div className="space-y-4">
                <div className="bg-[#F5F9F7] p-4 rounded-xl border border-[#DDEAE2] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        currentEmp.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentEmp.name)}&backgroundColor=162e3d&textColor=45c512`
                      }
                      alt={currentEmp.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-[#DDEAE2]"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#162E3D]">{currentEmp.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#162E3D] text-[#45C512] rounded-full font-bold">
                          {currentEmp.empId}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getTeamBadgeStyle(empTeam)}`}>
                          {empTeam}
                        </span>
                      </div>
                      <p className="text-xs text-[#5B7586] font-medium">
                        {currentEmp.designation} &bull; {currentEmp.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <div className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold">
                      {empPresent} Present
                    </div>
                    <div className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg font-bold">
                      {empLate} Late
                    </div>
                    <div className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg font-bold">
                      {empHalf} Half-Day
                    </div>
                    <div className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg font-bold">
                      {empLeaves} Leave
                    </div>
                    <div className="bg-red-100 text-red-800 px-2.5 py-1 rounded-lg font-bold">
                      {empAbsent} Absent
                    </div>
                  </div>
                </div>

                {/* 7-DAY CALENDAR GRID (SUN TO SAT) */}
                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
                    <div
                      key={dayName}
                      className={`text-center py-2 text-xs font-bold rounded-xl ${
                        idx === 0
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-[#162E3D] text-[#45C512]"
                      }`}
                    >
                      {dayName}
                    </div>
                  ))}

                  {/* Empty offset days for start of month */}
                  {(() => {
                    const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay();
                    const emptyCells = [];
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      emptyCells.push(
                        <div
                          key={`empty-${i}`}
                          className="min-h-[90px] bg-[#F5F9F7]/40 rounded-xl border border-dashed border-[#DDEAE2]/60 p-2"
                        />
                      );
                    }
                    return emptyCells;
                  })()}

                  {/* Calendar Days 1..daysInMonth */}
                  {dayIndices.map((day) => {
                    const dateStr = `${reportMonth}-${String(day).padStart(2, "0")}`;
                    const record = monthMap.get(`${currentEmp.id}_${dateStr}`);
                    const dateObj = new Date(yearNum, monthNum - 1, day);
                    const isSunday = dateObj.getDay() === 0;

                    return (
                      <div
                        key={day}
                        onClick={() => handleOpenEditModal(currentEmp, dateStr)}
                        className={`min-h-[90px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-[#45C512] ${
                          record?.status === "Present"
                            ? "bg-emerald-50/70 border-emerald-200"
                            : record?.status === "Late"
                            ? "bg-amber-50/70 border-amber-200"
                            : record?.status === "Half day"
                            ? "bg-orange-50/70 border-orange-200"
                            : record?.status === "Absent"
                            ? "bg-red-50/70 border-red-200"
                            : record?.status === "On Leave"
                            ? "bg-purple-50/70 border-purple-200"
                            : isSunday
                            ? "bg-rose-50/40 border-rose-100"
                            : "bg-white border-[#DDEAE2] hover:bg-[#F5F9F7]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isSunday ? "text-rose-600" : "text-[#162E3D]"
                            }`}
                          >
                            {day}
                          </span>
                          {record && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                record.status === "Present"
                                  ? "bg-emerald-200 text-emerald-800"
                                  : record.status === "Late"
                                  ? "bg-amber-200 text-amber-800"
                                  : record.status === "Half day"
                                  ? "bg-orange-200 text-orange-800"
                                  : record.status === "On Leave"
                                  ? "bg-purple-200 text-purple-800"
                                  : "bg-red-200 text-red-800"
                              }`}
                            >
                              {record.status}
                            </span>
                          )}
                        </div>

                        {record ? (
                          <div className="mt-1 space-y-0.5 text-[10px]">
                            <div className="font-mono text-[#162E3D] font-medium truncate flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-[#5B7586]" />
                              {record.checkInTime || "--"} - {record.checkOutTime || "--"}
                            </div>
                            <div className="text-[#5B7586] truncate flex items-center gap-1">
                              {record.workType === "Remote (WFH)" ? (
                                <Laptop className="w-2.5 h-2.5 text-blue-600" />
                              ) : record.workType === "Client Site" ? (
                                <MapPin className="w-2.5 h-2.5 text-purple-600" />
                              ) : (
                                <Building2 className="w-2.5 h-2.5 text-emerald-600" />
                              )}
                              <span>{record.workType || "Office"}</span>
                            </div>
                            {record.notes && (
                              <div className="text-[9px] text-[#5B7586] truncate italic">
                                "{record.notes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#8299A8] italic text-center my-auto">
                            {isSunday ? "Sunday" : "+ Click to set"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: DAILY ROSTER TABLE (CLASSIC LOG WITH QUICK BATCH & DATE PICKER) */}
      {/* ========================================================================= */}
      {viewMode === "daily" && (
        <div className="space-y-4">
          {/* Date Selector & Action Header */}
          <div className="bg-white p-5 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#162E3D]">Daily Attendance Roster</h2>
              <p className="text-xs text-[#5B7586]">
                Track, mark, and edit employee presence, check-in, and check-out logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Date Picker */}
              <div className="flex items-center gap-2 bg-[#F5F9F7] px-3 py-2 rounded-xl border border-[#DDEAE2]">
                <Calendar className="w-4 h-4 text-[#162E3D]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#162E3D] focus:outline-none cursor-pointer"
                />
              </div>

              {/* Quick Mark All Present */}
              <button
                onClick={handleMarkAllPresent}
                className="flex items-center gap-2 px-4 py-2 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All Present
              </button>
            </div>
          </div>

          {batchSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{batchSuccessMsg}</span>
            </div>
          )}

          {/* Daily Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-by">
              <div className="text-[11px] text-[#5B7586] font-semibold">Active Roster</div>
              <div className="text-lg font-bold text-[#162E3D] mt-0.5">{totalActiveStaff} Staff</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-by">
              <div className="text-[11px] text-[#2c5306] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Present
              </div>
              <div className="text-lg font-bold text-[#2c5306] mt-0.5">{presentCount}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-by">
              <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5" /> Late Arrival
              </div>
              <div className="text-lg font-bold text-amber-700 mt-0.5">{lateCount}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-by">
              <div className="text-[11px] text-orange-700 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Half Day
              </div>
              <div className="text-lg font-bold text-orange-700 mt-0.5">{halfDayCount}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-by">
              <div className="text-[11px] text-red-700 font-semibold flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" /> Absent
              </div>
              <div className="text-lg font-bold text-red-700 mt-0.5">{absentCount}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs font-bold text-[#162E3D] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#5B7586]" /> Filter:
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-medium text-[#162E3D]"
              >
                <option value="All">All Employees ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.empId})
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-medium text-[#162E3D]"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half day">Half day</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            <button
              onClick={fetchDailyData}
              title="Reload attendance"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] font-medium rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Attendance Roster Table */}
          <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#162E3D]">
                <thead className="bg-[#162E3D] text-white uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Work Mode</th>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4">Check-Out Time</th>
                    <th className="py-3 px-4">Notes / Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDEAE2]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-xs text-[#5B7586]">
                        Loading attendance records for {selectedDate}...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-xs text-[#5B7586]">
                        No employees matching filter criteria.
                      </td>
                    </tr>
                  ) : (() => {
                    const renderEmployeeRow = (emp: Employee) => {
                      const state = editState[emp.id] || {
                        status: "Present",
                        workType: "Office",
                        checkInTime: "",
                        checkOutTime: "",
                        notes: "",
                        isSaved: false,
                      };
                      const isSaving = savingId === emp.id;
                      const empTeam = getAttendanceTeam(emp);

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-[#F5F9F7]/70 transition-colors"
                        >
                          {/* Employee Column */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={
                                  emp.avatarUrl ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                    emp.name
                                  )}&backgroundColor=162e3d&textColor=45c512`
                                }
                                alt={emp.name}
                                className="w-8 h-8 rounded-full object-cover border border-[#DDEAE2]"
                              />
                              <div>
                                <div className="font-bold text-[#162E3D] flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                  <span className="text-[10px] font-mono px-1 py-0.2 bg-[#162E3D]/5 rounded text-[#162E3D]">
                                    {emp.empId}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#5B7586]">{emp.designation}</div>
                              </div>
                            </div>
                          </td>

                          {/* Team Column (Segregation) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTeamBadgeStyle(empTeam)}`}>
                              {empTeam}
                            </span>
                          </td>

                          {/* Status Selector */}
                          <td className="py-3.5 px-4">
                            <select
                              value={state.status}
                              onChange={(e) =>
                                handleFieldChange(emp.id, "status", e.target.value as AttendanceStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                                state.status === "Present"
                                  ? "bg-[#EEF9EB] text-[#1B4332] border-[#45C512]/60"
                                  : state.status === "Late"
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : state.status === "Half day"
                                  ? "bg-orange-50 text-orange-800 border-orange-300"
                                  : state.status === "On Leave"
                                  ? "bg-purple-50 text-purple-800 border-purple-300"
                                  : "bg-red-50 text-red-800 border-red-300"
                              }`}
                            >
                              <option value="Present">Present</option>
                              <option value="Late">Late</option>
                              <option value="Half day">Half day</option>
                              <option value="Absent">Absent</option>
                              <option value="On Leave">On Leave</option>
                            </select>
                          </td>

                          {/* Work Mode */}
                          <td className="py-3.5 px-4">
                            <select
                              value={state.workType || "Office"}
                              onChange={(e) =>
                                handleFieldChange(emp.id, "workType", e.target.value as WorkType)
                              }
                              className="px-2 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl font-medium"
                            >
                              <option value="Office">Office</option>
                              <option value="Remote (WFH)">Remote (WFH)</option>
                              <option value="Client Site">Client Site</option>
                            </select>
                          </td>

                          {/* Check-In */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              placeholder="e.g. 09:30 AM"
                              value={state.checkInTime}
                              onChange={(e) =>
                                handleFieldChange(emp.id, "checkInTime", e.target.value)
                              }
                              className="w-28 px-2.5 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-mono"
                            />
                          </td>

                          {/* Check-Out */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              placeholder="e.g. 06:30 PM"
                              value={state.checkOutTime}
                              onChange={(e) =>
                                handleFieldChange(emp.id, "checkOutTime", e.target.value)
                              }
                              className="w-28 px-2.5 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-mono"
                            />
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              placeholder="Add remark..."
                              value={state.notes}
                              onChange={(e) =>
                                handleFieldChange(emp.id, "notes", e.target.value)
                              }
                              className="w-full min-w-[150px] px-2.5 py-1.5 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                            />
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleSaveRow(emp.id)}
                              disabled={isSaving}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                state.isSaved
                                  ? "bg-white border border-[#DDEAE2] text-[#5B7586] hover:bg-[#F5F9F7]"
                                  : "bg-[#162E3D] text-[#45C512] shadow-sm hover:bg-[#244254]"
                              }`}
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSaving ? "Saving..." : state.isSaved ? "Saved" : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    };

                    if (groupByTeam) {
                      return ATTENDANCE_TEAMS.map((team) => {
                        const teamEmps = filteredEmployees.filter(
                          (emp) => getAttendanceTeam(emp) === team
                        );
                        if (teamEmps.length === 0) return null;
                        return (
                          <React.Fragment key={team}>
                            <tr className="bg-[#EEF9EB] border-t-2 border-[#162E3D]/15">
                              <td colSpan={8} className="py-2.5 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getTeamBadgeStyle(team)}`}>
                                      {team}
                                    </span>
                                    <span className="font-bold text-xs text-[#162E3D]">
                                      {team} Team Roster
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-semibold text-[#5B7586] bg-white px-2.5 py-0.5 rounded-full border border-[#DDEAE2]">
                                    {teamEmps.length} {teamEmps.length === 1 ? "Employee" : "Employees"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {teamEmps.map((emp) => renderEmployeeRow(emp))}
                          </React.Fragment>
                        );
                      });
                    }

                    return filteredEmployees.map((emp) => renderEmployeeRow(emp));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ATTENDANCE STATUS & TYPE MODAL */}
      {/* ========================================================================= */}
      {editModalOpen && modalEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#DDEAE2] shadow-2xl max-w-lg w-full overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="bg-[#162E3D] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#45C512] text-[#162E3D] flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-white">
                    Edit Attendance &amp; Shift Type
                  </h3>
                  <p className="text-xs text-[#8299A8]">
                    {modalDate} &bull; {modalEmployee.name} ({modalEmployee.empId})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Employee Summary Card */}
              <div className="flex items-center gap-3 p-3 bg-[#F5F9F7] rounded-2xl border border-[#DDEAE2]">
                <img
                  src={
                    modalEmployee.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(modalEmployee.name)}&backgroundColor=162e3d&textColor=45c512`
                  }
                  alt={modalEmployee.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#DDEAE2]"
                />
                <div>
                  <div className="text-xs font-bold text-[#162E3D] flex items-center gap-1.5 flex-wrap">
                    <span>{modalEmployee.name}</span>
                    <span className="font-mono text-[10px] bg-[#162E3D] text-[#45C512] px-1.5 py-0.2 rounded font-bold">
                      {modalEmployee.empId}
                    </span>
                    <span className={`text-[10px] px-2 py-0.2 rounded border font-semibold ${getTeamBadgeStyle(getAttendanceTeam(modalEmployee))}`}>
                      {getAttendanceTeam(modalEmployee)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5B7586]">
                    {modalEmployee.designation} &bull; {modalEmployee.department}
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#162E3D] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#45C512]" /> Quick Shift Presets:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset({
                        status: "Present",
                        workType: "Office",
                        inTime: "09:30 AM",
                        outTime: "06:30 PM",
                        notes: "Regular Office Shift (09:30 AM - 06:30 PM)",
                      })
                    }
                    className="p-2 text-left rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors"
                  >
                    <div className="font-bold">🏢 Office Regular</div>
                    <div className="text-[10px] opacity-75">09:30 AM - 06:30 PM</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset({
                        status: "Present",
                        workType: "Remote (WFH)",
                        inTime: "09:30 AM",
                        outTime: "06:30 PM",
                        notes: "Approved WFH Shift",
                      })
                    }
                    className="p-2 text-left rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors"
                  >
                    <div className="font-bold">💻 Remote / WFH</div>
                    <div className="text-[10px] opacity-75">09:30 AM - 06:30 PM</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset({
                        status: "Late",
                        workType: "Office",
                        inTime: "10:45 AM",
                        outTime: "06:30 PM",
                        notes: "Late arrival approved (after 10:30 AM)",
                      })
                    }
                    className="p-2 text-left rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors"
                  >
                    <div className="font-bold">⏰ Late Shift</div>
                    <div className="text-[10px] opacity-75">10:45 AM - 06:30 PM</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset({
                        status: "Half day",
                        workType: "Office",
                        inTime: "09:30 AM",
                        outTime: "02:00 PM",
                        notes: "Half day session",
                      })
                    }
                    className="p-2 text-left rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900 transition-colors"
                  >
                    <div className="font-bold">⏱️ Half Day</div>
                    <div className="text-[10px] opacity-75">09:30 AM - 02:00 PM</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset({
                        status: "On Leave",
                        workType: "Office",
                        inTime: "",
                        outTime: "",
                        notes: "Approved Leave",
                      })
                    }
                    className="p-2 text-left rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors"
                  >
                    <div className="font-bold">🌴 Approved Leave</div>
                    <div className="text-[10px] opacity-75">Full Day Paid Leave</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset({
                        status: "Absent",
                        workType: "Office",
                        inTime: "",
                        outTime: "",
                        notes: "Uninformed Absence",
                      })
                    }
                    className="p-2 text-left rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-900 transition-colors"
                  >
                    <div className="font-bold">❌ Absent</div>
                    <div className="text-[10px] opacity-75">Mark Unattended</div>
                  </button>
                </div>
              </div>

              {/* Status and Work Type Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#162E3D] block mb-1">
                    Attendance Status:
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl font-bold text-[#162E3D] focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  >
                    <option value="Present">Present (P)</option>
                    <option value="Late">Late (L)</option>
                    <option value="Half day">Half day (HD)</option>
                    <option value="Absent">Absent (A)</option>
                    <option value="On Leave">On Leave (LV)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#162E3D] block mb-1">
                    Work Location / Type:
                  </label>
                  <select
                    value={modalWorkType}
                    onChange={(e) => setModalWorkType(e.target.value as WorkType)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl font-bold text-[#162E3D] focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  >
                    <option value="Office">Office Working</option>
                    <option value="Remote (WFH)">Remote (WFH)</option>
                    <option value="Client Site">On-Site / Client Visit</option>
                  </select>
                </div>
              </div>

              {/* Check-In / Check-Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#162E3D] block mb-1">
                    Check-In Time:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:30 AM"
                    value={modalCheckIn}
                    onChange={(e) => setModalCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#162E3D] block mb-1">
                    Check-Out Time:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06:30 PM"
                    value={modalCheckOut}
                    onChange={(e) => setModalCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="text-xs font-bold text-[#162E3D] block mb-1">
                  Remarks / Leave Reason:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client presentation, Medical rest, approved half-day..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DDEAE2]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={modalSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {modalSaving ? "Saving..." : "Save & Update Attendance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
