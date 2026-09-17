"use client";

import React, { useState, useEffect } from "react";
import { Employee } from "@/lib/types";
import { AGENCY_DESIGNATIONS } from "@/lib/designations";
import { WorkspaceFileMetadata } from "@/lib/offerLetterUtils";
import OfferLetterModal from "./OfferLetterModal";
import {
  FileSpreadsheet,
  FileText,
  Download,
  FolderDown,
  Trash2,
  RefreshCw,
  HardDrive,
  Eye,
  CheckCircle2,
  Users,
  ShieldCheck,
  FileCheck2,
  Calendar,
  X,
  Printer,
  Sparkles,
  Sliders,
  ExternalLink,
} from "lucide-react";

export default function HRWorkspaceSection() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [files, setFiles] = useState<WorkspaceFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; html: string } | null>(null);

  // Offer Letter Studio Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const fetchEmployeesAndFiles = async () => {
    try {
      setLoading(true);
      const [empRes, fileRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/workspace"),
      ]);
      const empData = await empRes.json();
      const fileData = await fileRes.json();

      if (empData.success && empData.employees.length > 0) {
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
        if (!selectedEmpId && empList.length > 0) {
          setSelectedEmpId(empList[0].empId);
        }
      }
      if (fileData.success) {
        setFiles(fileData.files || []);
      }
    } catch (err) {
      console.error("Failed to fetch workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndFiles();
  }, []);

  const selectedEmployee = employees.find(
    (e) => e.empId === selectedEmpId || e.id === selectedEmpId
  ) || employees[0];

  // Save document to workspace folder stream
  const handleSaveToWorkspace = async (
    docType: "master_roster" | "appointment_letter" | "offer_letter" | "employee_dossier" | "nda_agreement"
  ) => {
    setGenerating(docType);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          empId: selectedEmployee?.empId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Document saved to Workspace Vault: ${data.file.fileName}`);
        fetchEmployeesAndFiles();
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setGenerating(null);
    }
  };

  // Delete file from workspace
  const handleDeleteFile = async (relativePath: string) => {
    try {
      const res = await fetch(
        `/api/workspace?file=${encodeURIComponent(relativePath)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        fetchEmployeesAndFiles();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const excelFilesCount = files.filter((f) => f.category === "excel").length;
  const wordFilesCount = files.filter((f) => f.category === "word").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-[#162E3D] text-white p-6 rounded-2xl shadow-by-lg border border-[#244254] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#45C512] text-[#162E3D] flex items-center justify-center flex-shrink-0 shadow-md">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-serif text-white tracking-wide">
                HR Workspace &amp; Employee Data Vault
              </h2>
              <span className="text-[10px] bg-[#45C512] text-[#162E3D] font-bold px-2 py-0.5 rounded-full uppercase">
                Excel &amp; Word
              </span>
            </div>
            <p className="text-xs text-[#A89898] mt-1">
              Centralized repository to store, stream, and archive employee records in Microsoft Excel (.xls) and official documents in Word (.doc).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0f1f2a] px-3.5 py-2 rounded-xl border border-[#244254] text-right">
            <div className="text-[10px] text-[#A89898]">Vault Storage</div>
            <div className="text-xs font-bold text-[#45C512] font-mono">./workspace/</div>
          </div>
          <button
            onClick={fetchEmployeesAndFiles}
            title="Refresh Vault"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {successMsg && (
        <div className="bg-[#EEFCD9] border border-[#45C512] text-[#1E3A06] p-3.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2c5306] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-[#2c5306] hover:text-[#1E3A06] text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#162E3D] text-[#45C512] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#162E3D]">{employees.length}</div>
            <div className="text-xs text-[#706161]">Staff Roster Count</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-800">{excelFilesCount}</div>
            <div className="text-xs text-[#706161]">Excel Masters in Vault</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-800">{wordFilesCount}</div>
            <div className="text-xs text-[#706161]">Word Docs in Vault</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEFCD9] text-[#2c5306] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2c5306]">100%</div>
            <div className="text-xs text-[#706161]">Encrypted Vault Integrity</div>
          </div>
        </div>
      </div>

      {/* TWO WORKSPACE MODULES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MODULE 1: EXCEL EMPLOYEE MASTER SPREADSHEET (5 COLS) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#162E3D]">Employee Master Data</h3>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">
                    Microsoft Excel (.xls)
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-[#F5F9F7] text-[#162E3D] px-2 py-0.5 rounded-full border border-[#DDEAE2] font-mono">
                Multi-Worksheet
              </span>
            </div>

            <p className="text-xs text-[#706161] leading-relaxed mb-4">
              Export the full agency roster into a multi-tab Excel workbook containing complete profile credentials, department breakdown ratios, and HR compliance timestamps.
            </p>

            <div className="bg-[#F5F9F7] p-3 rounded-xl border border-[#DDEAE2] space-y-2 mb-4 text-xs">
              <div className="flex items-center justify-between text-[#162E3D]">
                <span>Sheet 1: Employee Directory Master</span>
                <span className="font-bold text-emerald-700">14 Profiles</span>
              </div>
              <div className="flex items-center justify-between text-[#162E3D]">
                <span>Sheet 2: Department Headcount &amp; Ratio</span>
                <span className="font-bold text-emerald-700">11 Depts</span>
              </div>
              <div className="flex items-center justify-between text-[#162E3D]">
                <span>Format: Native XML Spreadsheet 2003</span>
                <span className="font-bold text-[#162E3D]">.xls</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#DDEAE2]">
            <a
              href="/api/workspace/download?generate=master_roster"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Excel (.xls)
            </a>
            <button
              onClick={() => handleSaveToWorkspace("master_roster")}
              disabled={generating === "master_roster"}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-xs rounded-xl transition-all cursor-pointer"
              title="Stream & save into workspace folder"
            >
              <FolderDown className="w-4 h-4" />
              {generating === "master_roster" ? "Saving..." : "Save to Vault"}
            </button>
          </div>
        </div>

        {/* MODULE 2: OFFICIAL DOCUMENTS IN WORD (.DOC) FORMAT (7 COLS) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#162E3D]">Official Letters &amp; Dossiers</h3>
                  <span className="text-[10px] text-blue-700 font-bold uppercase">
                    Microsoft Word (.doc)
                  </span>
                </div>
              </div>

              {/* Employee Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#706161] font-medium hidden sm:inline">Select Staff:</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.empId}>
                      {emp.empId} — {emp.name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Employee Info Strip */}
            {selectedEmployee && (
              <div className="bg-[#F5F9F7] px-3 py-2 rounded-xl border border-[#DDEAE2] mb-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#162E3D]">{selectedEmployee.name}</span>
                  <span className="text-[11px] bg-[#162E3D] text-[#45C512] px-1.5 py-0.2 rounded font-mono font-bold">
                    {selectedEmployee.empId}
                  </span>
                </div>
                <div className="text-[11px] text-[#706161]">
                  Role: <span className="font-semibold text-[#162E3D]">{selectedEmployee.designation}</span> &bull; {selectedEmployee.department}
                </div>
              </div>
            )}

            {/* 3 Document Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
              {/* Doc 1: Official 3-Page Letter of Offer */}
              <div className="p-3 bg-[#EEFCD9]/40 rounded-xl border-2 border-[#45C512] flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-14 h-14 bg-[#45C512]/30 rounded-full blur-sm pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-[#162E3D]">Letter Of Offer</span>
                    <span className="text-[9px] bg-[#45C512] text-[#162E3D] font-extrabold px-1.5 py-0.2 rounded uppercase">
                      3-Page Official
                    </span>
                  </div>
                  <p className="text-[11px] text-[#706161] line-clamp-2">
                    Official format: Anna Salai office, Annexure (16 terms), Code of Conduct &amp; 7-day hold policy.
                  </p>
                </div>
                <div className="space-y-1.5 mt-3 pt-2 border-t border-[#DDEAE2]">
                  <button
                    onClick={() => setIsOfferModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-[11px] rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview &amp; Customize
                  </button>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/api/workspace/download?generate=offer_letter&empId=${selectedEmployee?.empId}`}
                      className="flex-1 text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                      title="Direct Word .doc download"
                    >
                      <Download className="w-3 h-3" />
                      Word (.doc)
                    </a>
                    <button
                      onClick={() => handleSaveToWorkspace("offer_letter")}
                      disabled={generating === "offer_letter"}
                      title="Save to folder vault"
                      className="p-1.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] rounded-lg text-[11px] cursor-pointer"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Doc 2: Employee Dossier */}
              <div className="p-3 bg-[#F5F9F7] rounded-xl border border-[#DDEAE2] flex flex-col justify-between">
                <div>
                  <div className="font-bold text-xs text-[#162E3D] mb-1">Employee Dossier</div>
                  <p className="text-[11px] text-[#706161] line-clamp-2">
                    Complete service record with personal info, attendance totals &amp; leave history.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#DDEAE2]">
                  <a
                    href={`/api/workspace/download?generate=employee_dossier&empId=${selectedEmployee?.empId}`}
                    className="flex-1 text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-colors"
                  >
                    Word (.doc)
                  </a>
                  <button
                    onClick={() => handleSaveToWorkspace("employee_dossier")}
                    title="Save to folder vault"
                    className="p-1.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] rounded-lg text-[11px] cursor-pointer"
                  >
                    <FolderDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Doc 3: NDA Agreement */}
              <div className="p-3 bg-[#F5F9F7] rounded-xl border border-[#DDEAE2] flex flex-col justify-between">
                <div>
                  <div className="font-bold text-xs text-[#162E3D] mb-1">Agency NDA</div>
                  <p className="text-[11px] text-[#706161] line-clamp-2">
                    Confidentiality agreement protecting client ad accounts, SEO keywords &amp; code.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#DDEAE2]">
                  <a
                    href={`/api/workspace/download?generate=nda_agreement&empId=${selectedEmployee?.empId}`}
                    className="flex-1 text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-colors"
                  >
                    Word (.doc)
                  </a>
                  <button
                    onClick={() => handleSaveToWorkspace("nda_agreement")}
                    title="Save to folder vault"
                    className="p-1.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] rounded-lg text-[11px] cursor-pointer"
                  >
                    <FolderDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#706161] bg-[#F5F9F7] p-2.5 rounded-xl border border-[#DDEAE2] flex items-center justify-between">
            <span>Documents are styled with B &amp; Y agency typography and open natively in Word &amp; Google Docs.</span>
            <span className="font-bold text-[#162E3D]">Print &amp; Sign Ready</span>
          </div>
        </div>
      </div>

      {/* MODULE 3: WORKSPACE REPOSITORY FILE MANAGER */}
      <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#DDEAE2] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#162E3D] text-[#45C512] flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#162E3D]">Vault Document Repository</h3>
              <p className="text-[11px] text-[#706161]">
                Files stored on disk at <code className="bg-[#F5F9F7] px-1.5 py-0.5 rounded text-[#162E3D] font-mono">./workspace/</code>
              </p>
            </div>
          </div>

          <div className="text-xs text-[#706161]">
            Total Archived: <strong className="text-[#162E3D]">{files.length} documents</strong>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#706161]">
            <HardDrive className="w-10 h-10 text-[#A89898] mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-[#162E3D]">Vault repository is currently empty</p>
            <p className="mt-1">
              Click <span className="font-bold text-[#162E3D]">"Save to Vault"</span> above to stream and store Excel master data or Word appointment letters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F9F7] text-[#706161] border-b border-[#DDEAE2]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Document Name</th>
                  <th className="py-2.5 px-3 font-semibold">Format</th>
                  <th className="py-2.5 px-3 font-semibold">Associated Staff</th>
                  <th className="py-2.5 px-3 font-semibold">Folder Path</th>
                  <th className="py-2.5 px-3 font-semibold">File Size</th>
                  <th className="py-2.5 px-3 font-semibold">Date Saved</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDEAE2]">
                {files.map((file, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F9F7]/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#162E3D]">
                      <div className="flex items-center gap-2">
                        {file.category === "excel" ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                        <span className="font-mono text-[11px] truncate max-w-sm">{file.fileName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          file.category === "excel"
                            ? "bg-emerald-100 text-emerald-800"
                            : file.fileName.includes("Offer")
                            ? "bg-[#EEFCD9] text-[#1E3A06] border border-[#45C512]"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {file.category === "excel"
                          ? "Excel .xls"
                          : file.fileName.includes("Offer")
                          ? "Offer Letter (.doc)"
                          : "Word .doc"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#162E3D]">
                      {file.empId ? (
                        <span className="px-2 py-0.5 rounded bg-[#162E3D] text-[#45C512] font-mono text-[10px] font-bold">
                          {file.empId}
                        </span>
                      ) : (
                        <span className="text-[#706161]">Company All</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#706161] font-mono text-[11px]">
                      {file.relativePath}
                    </td>
                    <td className="py-2.5 px-3 text-[#162E3D] font-semibold">
                      {file.sizeFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-[#706161]">
                      {new Date(file.createdAt).toLocaleString("en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={file.downloadUrl}
                          download={file.fileName}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          title="Stream and download document"
                        >
                          <Download className="w-3 h-3" />
                          Stream
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.relativePath)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete from workspace"
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

      {/* ========================================================================= */}
      {/* LIVE 3-PAGE OFFER LETTER STUDIO MODAL */}
      <OfferLetterModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        initialEmployee={selectedEmployee}
        employees={employees}
        onSavedToVault={() => {
          fetchEmployeesAndFiles();
          setSuccessMsg("Official 3-Page Letter Of Offer saved to HR Vault & synchronized!");
          setTimeout(() => setSuccessMsg(null), 6000);
        }}
      />
    </div>
  );
}
