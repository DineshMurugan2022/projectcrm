"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Printer,
  Download,
  FolderDown,
  X,
  RefreshCw,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Clock,
  Sparkles,
  Check,
  Building2,
  AlertCircle
} from "lucide-react";
import {
  OfferLetterData,
  formatIndianCurrency,
  numberToIndianWords,
  getDefaultSalaryForDesignation,
  formatSlashDate,
  formatLongDate
} from "@/lib/offerLetterUtils";
import { AGENCY_DESIGNATIONS } from "@/lib/designations";
import { Employee } from "@/lib/types";

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployee?: Employee | null;
  employees: Employee[];
  onSavedToVault?: () => void;
}

const SALARY_PRESETS = [
  { label: "₹1.8L (15k/mo)", annual: 180000, monthly: 15000 },
  { label: "₹2.4L (20k/mo)", annual: 240000, monthly: 20000 },
  { label: "₹3.0L (25k/mo)", annual: 300000, monthly: 25000 },
  { label: "₹3.6L (30k/mo)", annual: 360000, monthly: 30000 },
  { label: "₹4.2L (35k/mo)", annual: 420000, monthly: 35000 },
  { label: "₹4.8L (40k/mo)", annual: 480000, monthly: 40000 },
  { label: "₹6.0L (50k/mo)", annual: 600000, monthly: 50000 },
];

const TIMING_PRESETS = [
  "Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm.",
  "Monday to Friday - 9:00 am to 6:00 pm. | Saturday Alternate Half-Day",
  "Monday to Friday - 10:00 am to 7:00 pm.",
];

const CITY_PRESETS = [
  "Chennai, Tamil Nadu - 600006",
  "Chennai, Tamil Nadu - 600030",
  "Chennai, Tamil Nadu - 600017",
  "Coimbatore, Tamil Nadu - 641001",
  "Bengaluru, Karnataka - 560001",
];

export default function OfferLetterModal({
  isOpen,
  onClose,
  initialEmployee,
  employees,
  onSavedToVault,
}: OfferLetterModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployee?.empId || "");
  const [syncToProfile, setSyncToProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(1);
  const [customDesignation, setCustomDesignation] = useState(false);

  // Form state
  const [form, setForm] = useState<OfferLetterData>({
    candidateName: initialEmployee?.name || "Krish Babu",
    empId: initialEmployee?.empId || "BYT-101",
    designation: initialEmployee?.designation || "FullStack Developer",
    dob: initialEmployee?.dob || "1998-06-15",
    addressLine1: initialEmployee?.addressLine1 || "No: 12, Anna Nagar 2nd Avenue,",
    addressLine2: initialEmployee?.addressLine2 || "Shenoy Nagar,",
    cityStatePin: initialEmployee?.cityStatePin || "Chennai, Tamil Nadu - 600030",
    annualSalary: initialEmployee?.annualSalary || 120000,
    monthlySalary: initialEmployee?.monthlySalary || 10000,
    annualSalaryWords: "",
    dateOfJoining: initialEmployee?.dateOfJoining || new Date().toISOString().split("T")[0],
    offerDate: new Date().toISOString().split("T")[0],
    signatoryName: initialEmployee?.signatoryName || "Babu B",
    signatoryTitle: initialEmployee?.signatoryTitle || "Branch Manager",
    workTimings: initialEmployee?.workTimings || "Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm.",
    salutationPrefix: "Mr./Ms.",
  });

  // Debounced auto-preview updater
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPreviewUpdate = () => {
    setPreviewKey((k) => k + 1);
  };

  const handleFormChange = (updates: Partial<OfferLetterData>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      if (updates.annualSalary !== undefined && updates.annualSalary > 0) {
        next.annualSalaryWords = numberToIndianWords(updates.annualSalary);
      }
      return next;
    });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setPreviewKey((k) => k + 1);
    }, 450);
  };

  // Populate from chosen employee
  const loadEmployee = (emp: Employee) => {
    setSelectedEmpId(emp.empId);
    const defSal = getDefaultSalaryForDesignation(emp.designation);
    const isStandard = (AGENCY_DESIGNATIONS as readonly string[]).includes(emp.designation);
    setCustomDesignation(!isStandard);

    const newForm: OfferLetterData = {
      candidateName: emp.name,
      empId: emp.empId,
      designation: emp.designation,
      dob: emp.dob || "1998-06-15",
      addressLine1: emp.addressLine1 || "No: 12, Anna Nagar 2nd Avenue,",
      addressLine2: emp.addressLine2 || "Shenoy Nagar,",
      cityStatePin: emp.cityStatePin || "Chennai, Tamil Nadu - 600030",
      annualSalary: emp.annualSalary || defSal.annual,
      monthlySalary: emp.monthlySalary || defSal.monthly,
      annualSalaryWords: numberToIndianWords(emp.annualSalary || defSal.annual),
      dateOfJoining: emp.dateOfJoining || new Date().toISOString().split("T")[0],
      offerDate: new Date().toISOString().split("T")[0],
      signatoryName: emp.signatoryName || "Babu B",
      signatoryTitle: emp.signatoryTitle || "Branch Manager",
      workTimings: emp.workTimings || "Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm.",
      salutationPrefix: "Mr./Ms.",
    };
    setForm(newForm);
    setPreviewKey((k) => k + 1);
  };

  useEffect(() => {
    if (initialEmployee) {
      loadEmployee(initialEmployee);
    }
  }, [initialEmployee]);

  if (!isOpen) return null;

  // Handle Salary changes
  const setAnnualCTC = (annual: number) => {
    const monthly = Math.round(annual / 12);
    handleFormChange({
      annualSalary: annual,
      monthlySalary: monthly,
      annualSalaryWords: numberToIndianWords(annual),
    });
  };

  const setMonthlyPay = (monthly: number) => {
    const annual = monthly * 12;
    handleFormChange({
      monthlySalary: monthly,
      annualSalary: annual,
      annualSalaryWords: numberToIndianWords(annual),
    });
  };

  // Print Handler
  const handlePrint = () => {
    const iframe = document.getElementById("offer-letter-studio-frame") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  // Save to HR Vault & Database Profile
  const handleSaveToVault = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: "offer_letter",
          empId: form.empId,
          customOfferData: form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (syncToProfile && form.empId) {
          const matchedEmp = employees.find((e) => e.empId === form.empId);
          if (matchedEmp) {
            await fetch("/api/employees/" + matchedEmp.id, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dob: form.dob,
                addressLine1: form.addressLine1,
                addressLine2: form.addressLine2,
                cityStatePin: form.cityStatePin,
                annualSalary: form.annualSalary,
                monthlySalary: form.monthlySalary,
                dateOfJoining: form.dateOfJoining,
                designation: form.designation,
                workTimings: form.workTimings,
                signatoryName: form.signatoryName,
                signatoryTitle: form.signatoryTitle,
              }),
            });
          }
        }

        setSaveSuccessMsg("Saved to Vault: " + (data.file?.fileName || "Letter Of Offer"));
        if (onSavedToVault) onSavedToVault();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Save offer error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const previewUrl =
    "/api/workspace/download?generate=offer_letter&format=html" +
    "&candidateName=" + encodeURIComponent(form.candidateName) +
    "&designation=" + encodeURIComponent(form.designation) +
    "&empId=" + encodeURIComponent(form.empId) +
    "&dob=" + encodeURIComponent(form.dob || "") +
    "&addressLine1=" + encodeURIComponent(form.addressLine1 || "") +
    "&addressLine2=" + encodeURIComponent(form.addressLine2 || "") +
    "&cityStatePin=" + encodeURIComponent(form.cityStatePin || "") +
    "&annualSalary=" + form.annualSalary +
    "&monthlySalary=" + form.monthlySalary +
    "&doj=" + encodeURIComponent(form.dateOfJoining || "") +
    "&offerDate=" + encodeURIComponent(form.offerDate || "") +
    "&signatoryName=" + encodeURIComponent(form.signatoryName || "") +
    "&signatoryTitle=" + encodeURIComponent(form.signatoryTitle || "") +
    "&workTimings=" + encodeURIComponent(form.workTimings || "") +
    "&v=" + previewKey;

  const wordDownloadUrl =
    "/api/workspace/download?generate=offer_letter" +
    "&candidateName=" + encodeURIComponent(form.candidateName) +
    "&designation=" + encodeURIComponent(form.designation) +
    "&empId=" + encodeURIComponent(form.empId) +
    "&dob=" + encodeURIComponent(form.dob || "") +
    "&addressLine1=" + encodeURIComponent(form.addressLine1 || "") +
    "&addressLine2=" + encodeURIComponent(form.addressLine2 || "") +
    "&cityStatePin=" + encodeURIComponent(form.cityStatePin || "") +
    "&annualSalary=" + form.annualSalary +
    "&monthlySalary=" + form.monthlySalary +
    "&doj=" + encodeURIComponent(form.dateOfJoining || "") +
    "&offerDate=" + encodeURIComponent(form.offerDate || "") +
    "&signatoryName=" + encodeURIComponent(form.signatoryName || "") +
    "&signatoryTitle=" + encodeURIComponent(form.signatoryTitle || "") +
    "&workTimings=" + encodeURIComponent(form.workTimings || "");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#DDEAE2] w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-[#162E3D] text-white px-4 py-3 md:px-6 md:py-3.5 flex items-center justify-between border-b border-[#244254] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#45C512] text-[#162E3D] flex items-center justify-center font-bold shadow-md flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-serif text-white tracking-wide">
                  Letter Of Offer Studio &amp; Editor
                </h3>
                <span className="text-[10px] bg-[#45C512] text-[#162E3D] font-bold px-2 py-0.5 rounded-full uppercase">
                  3-Page Canva Format
                </span>
              </div>
              <p className="text-[11px] text-[#A89898] line-clamp-1">
                Full editing for Dates, Salary, Address, DOB, Designations &bull; Live A4 Preview &bull; Word (.doc) &bull; Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#45C512] hover:bg-[#8ee636] text-[#162E3D] rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Print directly or save as PDF via browser print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
            <a
              href={wordDownloadUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Download editable Microsoft Word .doc file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Word (.doc)</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Area: 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* LEFT COLUMN: EDIT CONTROLS */}
          <div className="lg:col-span-5 p-4 md:p-5 border-r border-[#DDEAE2] overflow-y-auto space-y-4 bg-[#F5F9F7]/50">
            
            {/* Quick Employee Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-2xs">
              <label className="block text-[11px] font-bold text-[#162E3D] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#2c5306]" />
                  Load Existing Employee Data:
                </span>
                <span className="text-[10px] text-[#706161] font-normal">
                  Auto-populates fields
                </span>
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  const emp = employees.find((emp) => emp.empId === e.target.value);
                  if (emp) loadEmployee(emp);
                }}
                className="w-full px-3 py-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
              >
                <option value="">-- Choose Employee or Create Custom --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.empId}>
                    {emp.empId} — {emp.name} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>

            {/* SECTION 1: CANDIDATE & ROLE */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#DDEAE2] pb-2">
                <span className="text-xs font-bold text-[#162E3D] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#2c5306]" />
                  Candidate &amp; Designation
                </span>
                <span className="text-[10px] text-[#45C512] bg-[#162E3D] px-2 py-0.5 rounded-full font-mono font-bold">
                  {form.empId || "NEW"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.candidateName}
                    onChange={(e) => handleFormChange({ candidateName: e.target.value })}
                    placeholder="e.g. Krish Babu"
                    className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Salutation
                  </label>
                  <select
                    value={form.salutationPrefix || "Mr./Ms."}
                    onChange={(e) => handleFormChange({ salutationPrefix: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Mr./Ms.">Mr./Ms.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={form.empId}
                    onChange={(e) => handleFormChange({ empId: e.target.value })}
                    placeholder="BYT-101"
                    className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-mono font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#162E3D]">
                      Designation
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomDesignation(!customDesignation)}
                      className="text-[10px] text-[#2c5306] font-bold hover:underline cursor-pointer"
                    >
                      {customDesignation ? "Standard List" : "Custom"}
                    </button>
                  </div>
                  {customDesignation ? (
                    <input
                      type="text"
                      value={form.designation}
                      onChange={(e) => handleFormChange({ designation: e.target.value })}
                      placeholder="Enter custom role..."
                      className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                    />
                  ) : (
                    <select
                      value={form.designation}
                      onChange={(e) => {
                        const des = e.target.value;
                        const defSal = getDefaultSalaryForDesignation(des);
                        handleFormChange({
                          designation: des,
                          annualSalary: defSal.annual,
                          monthlySalary: defSal.monthly,
                          annualSalaryWords: numberToIndianWords(defSal.annual),
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                    >
                      {AGENCY_DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: DATES & DATE OF BIRTH */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#DDEAE2] pb-2">
                <span className="text-xs font-bold text-[#162E3D] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2c5306]" />
                  Dates &amp; Date Of Birth (DOB)
                </span>
                <span className="text-[10px] text-[#706161]">Formatted for 3 pages</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Offer Issue Date:
                  </label>
                  <input
                    type="date"
                    value={form.offerDate}
                    onChange={(e) => handleFormChange({ offerDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                  <span className="text-[10px] text-[#706161] mt-0.5 block truncate">
                    {formatLongDate(form.offerDate)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Joining Date (DOJ):
                  </label>
                  <input
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(e) => handleFormChange({ dateOfJoining: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                  <span className="text-[10px] text-[#706161] mt-0.5 block truncate">
                    {formatSlashDate(form.dateOfJoining)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Date of Birth (DOB):
                  </label>
                  <input
                    type="date"
                    value={form.dob && form.dob.includes("-") ? form.dob : "1998-06-15"}
                    onChange={(e) => handleFormChange({ dob: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                  <span className="text-[10px] text-[#706161] mt-0.5 block truncate">
                    {formatSlashDate(form.dob)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: SALARY & COMPENSATION */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#DDEAE2] pb-2">
                <span className="text-xs font-bold text-[#162E3D] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#2c5306]" />
                  Compensation &amp; Salary (₹)
                </span>
                <span className="text-[10px] text-[#2c5306] font-bold">
                  Auto CTC &harr; Monthly Sync
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Annual CTC (₹):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#706161]">₹</span>
                    <input
                      type="number"
                      value={form.annualSalary}
                      onChange={(e) => setAnnualCTC(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                    />
                  </div>
                  <span className="text-[10px] text-[#706161] mt-0.5 block">
                    ₹{formatIndianCurrency(form.annualSalary)} / annum
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Monthly Gross Pay (₹):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#706161]">₹</span>
                    <input
                      type="number"
                      value={form.monthlySalary}
                      onChange={(e) => setMonthlyPay(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                    />
                  </div>
                  <span className="text-[10px] text-[#706161] mt-0.5 block">
                    ₹{formatIndianCurrency(form.monthlySalary || 0)} / month
                  </span>
                </div>
              </div>

              {/* Quick CTC Chips */}
              <div>
                <label className="block text-[10px] font-bold text-[#706161] uppercase tracking-wider mb-1.5">
                  Quick Salary Chips (Click to apply):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SALARY_PRESETS.map((p) => (
                    <button
                      key={p.annual}
                      type="button"
                      onClick={() => setAnnualCTC(p.annual)}
                      className={
                        "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer " +
                        (form.annualSalary === p.annual
                          ? "bg-[#162E3D] text-[#45C512] border-[#162E3D]"
                          : "bg-[#F5F9F7] text-[#162E3D] border-[#DDEAE2] hover:bg-[#DDEAE2]")
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Words Display & Edit */}
              <div className="bg-[#EEFCD9] p-2.5 rounded-xl border border-[#45C512] text-[11px] text-[#1E3A06]">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-[#2c5306]" />
                  In Indian Words (Appears on Page 1):
                </div>
                <input
                  type="text"
                  value={form.annualSalaryWords || numberToIndianWords(form.annualSalary)}
                  onChange={(e) => handleFormChange({ annualSalaryWords: e.target.value })}
                  className="w-full px-2 py-1 bg-white/80 border border-[#45C512] rounded-lg text-xs font-medium text-[#1E3A06] focus:ring-1 focus:ring-[#2c5306]"
                />
              </div>
            </div>

            {/* SECTION 4: CANDIDATE RESIDENTIAL ADDRESS */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#DDEAE2] pb-2">
                <span className="text-xs font-bold text-[#162E3D] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2c5306]" />
                  Candidate Residential Address
                </span>
                <span className="text-[10px] text-[#706161]">Appears on Page 1</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                  Address Line 1 (Door / Flat / Street):
                </label>
                <input
                  type="text"
                  value={form.addressLine1 || ""}
                  onChange={(e) => handleFormChange({ addressLine1: e.target.value })}
                  placeholder="No: 12, Anna Nagar 2nd Avenue,"
                  className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                  Address Line 2 (Area / Locality):
                </label>
                <input
                  type="text"
                  value={form.addressLine2 || ""}
                  onChange={(e) => handleFormChange({ addressLine2: e.target.value })}
                  placeholder="Shenoy Nagar,"
                  className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                  City, State &amp; Pincode:
                </label>
                <input
                  type="text"
                  value={form.cityStatePin || ""}
                  onChange={(e) => handleFormChange({ cityStatePin: e.target.value })}
                  placeholder="Chennai, Tamil Nadu - 600030"
                  className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              {/* Quick City Chips */}
              <div className="flex flex-wrap gap-1 pt-1">
                {CITY_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFormChange({ cityStatePin: c })}
                    className="text-[10px] bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] px-2 py-0.5 rounded border border-[#DDEAE2] cursor-pointer"
                  >
                    {c.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 5: WORKING HOURS & SIGNATORY */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#DDEAE2] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#DDEAE2] pb-2">
                <span className="text-xs font-bold text-[#162E3D] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#2c5306]" />
                  Working Hours &amp; Authorized Signatory
                </span>
                <span className="text-[10px] text-[#706161]">Page 2 &amp; 3 Terms</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                  Official Work Timings (Clause #4):
                </label>
                <input
                  type="text"
                  value={form.workTimings || ""}
                  onChange={(e) => handleFormChange({ workTimings: e.target.value })}
                  placeholder="Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm."
                  className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {TIMING_PRESETS.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleFormChange({ workTimings: t })}
                      className="text-[9px] bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] px-2 py-0.5 rounded border border-[#DDEAE2] cursor-pointer truncate max-w-xs"
                    >
                      Preset {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Authorized Signatory Name:
                  </label>
                  <input
                    type="text"
                    value={form.signatoryName || ""}
                    onChange={(e) => handleFormChange({ signatoryName: e.target.value })}
                    placeholder="Babu B"
                    className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs font-bold text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#162E3D] mb-1">
                    Signatory Designation:
                  </label>
                  <input
                    type="text"
                    value={form.signatoryTitle || ""}
                    onChange={(e) => handleFormChange({ signatoryTitle: e.target.value })}
                    placeholder="Branch Manager"
                    className="w-full px-3 py-1.5 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-xs text-[#162E3D] focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>
              </div>
            </div>

            {/* Sync to Database Profile Checkbox */}
            <div className="flex items-center gap-2 bg-[#F5F9F7] p-2.5 rounded-xl border border-[#DDEAE2]">
              <input
                type="checkbox"
                id="sync-profile-check"
                checked={syncToProfile}
                onChange={(e) => setSyncToProfile(e.target.checked)}
                className="w-4 h-4 rounded text-[#162E3D] focus:ring-[#45C512] accent-[#162E3D]"
              />
              <label htmlFor="sync-profile-check" className="text-xs text-[#162E3D] font-medium cursor-pointer">
                Save changes (DOB, Address, Salary) directly to Employee Directory profile
              </label>
            </div>

          </div>

          {/* RIGHT COLUMN: INTERACTIVE A4 LIVE PREVIEW */}
          <div className="lg:col-span-7 bg-[#162E3D]/5 p-3 md:p-5 flex flex-col overflow-hidden">
            
            {/* Top Preview Bar */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#162E3D]">Official 3-Page Document Simulation</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Synced
                </span>
              </div>
              <button
                onClick={triggerPreviewUpdate}
                className="flex items-center gap-1 text-[11px] text-[#162E3D] hover:text-black font-semibold bg-white px-2.5 py-1 rounded-xl border border-[#DDEAE2] shadow-2xs hover:bg-[#F5F9F7] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Update Preview
              </button>
            </div>

            {/* Iframe Preview */}
            <div className="flex-1 bg-white rounded-2xl border border-[#DDEAE2] shadow-inner overflow-hidden flex flex-col">
              <iframe
                id="offer-letter-studio-frame"
                src={previewUrl}
                className="w-full flex-1 border-0 min-h-[540px]"
                title="B&Y Technologies Official Letter of Offer Preview"
              />
            </div>
          </div>

        </div>

        {/* Modal Bottom Action Footer */}
        <div className="bg-[#F5F9F7] p-4 border-t border-[#DDEAE2] flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-[#706161] text-center sm:text-left flex items-center gap-2">
            {saveSuccessMsg ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {saveSuccessMsg}
              </span>
            ) : (
              <span>
                Includes registered office <strong>624 Anna Salai</strong>, 16 Annexure terms, 15 Code of Conduct rules &amp; dual signatures.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#45C512] hover:bg-[#8ee636] text-[#162E3D] font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <a
              href={wordDownloadUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Word (.doc)
            </a>
            <button
              onClick={handleSaveToVault}
              disabled={isSaving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <FolderDown className="w-4 h-4" />
              {isSaving ? "Saving to Vault..." : "Save to Vault"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
