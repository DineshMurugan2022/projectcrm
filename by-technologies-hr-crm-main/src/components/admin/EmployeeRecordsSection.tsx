"use client";

import React, { useState, useEffect } from "react";
import { Employee } from "@/lib/types";
import {
  AGENCY_DESIGNATIONS,
  AgencyDesignation,
  DESIGNATION_DEPARTMENT_MAP,
} from "@/lib/designations";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Key,
  Calendar,
  Building2,
  Briefcase,
  Phone,
  Mail,
  X,
  AlertTriangle,
  RefreshCw,
  FileText,
  DollarSign,
  MapPin,
  Sparkles,
  CreditCard,
} from "lucide-react";
import OfferLetterModal from "./OfferLetterModal";
import { getDefaultSalaryForDesignation } from "@/lib/offerLetterUtils";

interface EmployeeRecordsSectionProps {
  onSelectVisitingCard?: (employee: Employee) => void;
}

export default function EmployeeRecordsSection({
  onSelectVisitingCard,
}: EmployeeRecordsSectionProps = {}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToastNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  // Offer Letter Studio Modal State
  const [offerLetterTargetEmp, setOfferLetterTargetEmp] = useState<Employee | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "FullStack Developer",
    department: "Web & Tech Engineering",
    dateOfJoining: new Date().toISOString().split("T")[0],
    status: "active" as "active" | "inactive",
    password: "password123",
    dob: "1998-06-15",
    addressLine1: "",
    addressLine2: "",
    cityStatePin: "Chennai, Tamil Nadu - 600006",
    annualSalary: 120000,
    monthlySalary: 10000,
  });
  const [customDesignation, setCustomDesignation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const departments = [
    "Executive Leadership",
    "Operations & Management",
    "People Operations & HR",
    "Business Development & Sales",
    "Client Outreach & Telecalling",
    "Web & Tech Engineering",
    "Creative Studio",
    "SEO & Organic Growth",
    "Paid Advertising",
    "Social Media & PR",
    "Customer Support & Success",
  ];

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employees", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success) {
        let list: Employee[] = data.employees;
        try {
          const raw = localStorage.getItem("byt_deleted_emp_ids");
          if (raw) {
            const deletedIds: string[] = JSON.parse(raw);
            list = list.filter((e) => !deletedIds.includes(e.id));
          }
        } catch (e) {
          // ignore
        }
        setEmployees(list);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openAddModal = () => {
    const defSal = getDefaultSalaryForDesignation(AGENCY_DESIGNATIONS[0]);
    setFormData({
      name: "",
      email: "",
      phone: "",
      designation: AGENCY_DESIGNATIONS[0],
      department: DESIGNATION_DEPARTMENT_MAP[AGENCY_DESIGNATIONS[0]] || "Executive Leadership",
      dateOfJoining: new Date().toISOString().split("T")[0],
      status: "active",
      password: "password123",
      dob: "1998-06-15",
      addressLine1: "No: 12, Anna Nagar 2nd Avenue,",
      addressLine2: "Shenoy Nagar,",
      cityStatePin: "Chennai, Tamil Nadu - 600030",
      annualSalary: defSal.annual,
      monthlySalary: defSal.monthly,
    });
    setCustomDesignation(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    const isStandard = (AGENCY_DESIGNATIONS as readonly string[]).includes(emp.designation);
    setCustomDesignation(!isStandard);
    const defSal = getDefaultSalaryForDesignation(emp.designation);
    setFormData({
      name: emp.name,
      email: emp.email || "",
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department,
      dateOfJoining: emp.dateOfJoining,
      status: emp.status,
      password: emp.password,
      dob: emp.dob || "1998-06-15",
      addressLine1: emp.addressLine1 || "",
      addressLine2: emp.addressLine2 || "",
      cityStatePin: emp.cityStatePin || "Chennai, Tamil Nadu - 600030",
      annualSalary: emp.annualSalary || defSal.annual,
      monthlySalary: emp.monthlySalary || defSal.monthly,
    });
    setFormError(null);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      if (editingEmployee) {
        // PUT update
        const res = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.success) {
          setEditingEmployee(null);
          fetchEmployees();
        } else {
          setFormError(data.error || "Failed to update employee");
        }
      } else {
        // POST create
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.success) {
          try {
            const deletedKey = "byt_deleted_emp_ids";
            const raw = localStorage.getItem(deletedKey);
            if (raw && data.employee) {
              const ids: string[] = JSON.parse(raw);
              const filtered = ids.filter((id) => id !== data.employee.id && id !== data.employee.empId);
              localStorage.setItem(deletedKey, JSON.stringify(filtered));
            }
          } catch (e) {}
          setIsAddModalOpen(false);
          fetchEmployees();
        } else {
          setFormError(data.error || "Failed to create employee");
        }
      }
    } catch (err) {
      setFormError("Server connection error. Please retry.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const nextStatus = emp.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    const target = deletingEmployee;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/employees/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success) {
        // 1. Immediately remove from local React state
        setEmployees((prev) =>
          prev.filter((e) => e.id !== target.id && e.empId !== target.empId)
        );
        // 2. Persist to client tombstone storage as secondary persistence guarantee
        try {
          const deletedKey = "byt_deleted_emp_ids";
          const raw = localStorage.getItem(deletedKey);
          const ids: string[] = raw ? JSON.parse(raw) : [];
          if (!ids.includes(target.id)) ids.push(target.id);
          localStorage.setItem(deletedKey, JSON.stringify(ids));
        } catch (e) {
          // ignore
        }
        // 3. Close modal & show confirmation toast
        setDeletingEmployee(null);
        showToastNotification("Employee deleted successfully");
        // 4. Refetch fresh list from server to confirm backend persistence
        await fetchEmployees();
      } else {
        alert(data.error || "Failed to delete employee");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete employee. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(search.toLowerCase())) ||
      emp.empId.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    const matchesDesignation =
      designationFilter === "All" || emp.designation === designationFilter;
    const matchesStatus = statusFilter === "All" || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesDesignation && matchesStatus;
  });

  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === "active").length;
  const inactiveCount = employees.filter((e) => e.status === "inactive").length;
  const departmentsCount = new Set(employees.map((e) => e.department)).size;

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#162E3D] text-[#45C512] font-semibold text-xs rounded-xl shadow-2xl border border-[#45C512]/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#45C512] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#162E3D] text-[#45C512] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#162E3D]">{totalEmployees}</div>
            <div className="text-xs text-[#706161]">Total Staff</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEFCD9] text-[#2c5306] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2c5306]">{activeCount}</div>
            <div className="text-xs text-[#706161]">Active Accounts</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-red-700">{inactiveCount}</div>
            <div className="text-xs text-[#706161]">Inactive / Exited</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5F9F7] text-[#162E3D] flex items-center justify-center font-bold border border-[#DDEAE2]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#162E3D]">{departmentsCount}</div>
            <div className="text-xs text-[#706161]">Agency Depts</div>
          </div>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DDEAE2] shadow-by space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#162E3D]">Employee Directory</h2>
            <p className="text-xs text-[#706161]">
              Manage credentials, designations, department assignments, and portal access.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#162E3D] hover:bg-[#244254] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#45C512]" />
            Add New Employee
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#706161] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-medium"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-medium"
            >
              <option value="All">All Designations</option>
              {AGENCY_DESIGNATIONS.map((des) => (
                <option key={des} value={des}>
                  {des}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <button
              onClick={fetchEmployees}
              title="Refresh list"
              className="p-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-[#706161] hover:text-[#162E3D] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-[#DDEAE2] shadow-by overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#162E3D]">
            <thead className="bg-[#162E3D] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Designation &amp; Dept</th>
                <th className="py-3 px-4">Date Joined</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDEAE2]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-[#706161]">
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-[#EEFCD9] border border-[#45C512]/40 flex items-center justify-center mb-3">
                        <UserPlus className="w-6 h-6 text-[#2E6B08]" />
                      </div>
                      <h4 className="text-sm font-bold text-[#162E3D]">No Employee Records Yet</h4>
                      <p className="text-xs text-[#706161] mt-1 mb-4">
                        Your database is completely clean. Click below to create your first employee record.
                      </p>
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add First Employee
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-[#706161]">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#F5F9F7]/80 transition-colors group"
                  >
                    {/* Employee Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            emp.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              emp.name
                            )}&backgroundColor=331e1e&textColor=a2fc4b`
                          }
                          alt={emp.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#DDEAE2] bg-white flex-shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#162E3D] flex items-center gap-2">
                            <span>{emp.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#162E3D]/5 rounded text-[#162E3D] border border-[#162E3D]/10">
                              {emp.empId}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#706161]">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-[#162E3D] font-medium">{emp.phone || "—"}</div>
                    </td>

                    {/* Designation & Dept */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#162E3D]">{emp.designation}</div>
                      <div className="text-[11px] text-[#706161]">{emp.department}</div>
                    </td>

                    {/* Joining Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#706161]">
                      {emp.dateOfJoining}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          emp.status === "active"
                            ? "bg-[#EEFCD9] text-[#234404] border border-[#45C512]/60 hover:bg-[#d5f7a0]"
                            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {emp.status === "active" ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3c7809]" />
                            Active
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Password */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#706161]">
                      <span className="px-2 py-0.5 bg-[#F5F9F7] rounded border border-[#DDEAE2] text-[#162E3D]">
                        {emp.password}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setOfferLetterTargetEmp(emp);
                            setIsOfferModalOpen(true);
                          }}
                          title="Open 3-Page Letter Of Offer Studio for this employee"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EEFCD9] hover:bg-[#d8f99e] text-[#1E3A06] border border-[#45C512] text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3 h-3 text-[#2c5306]" />
                          Offer Letter
                        </button>
                        {onSelectVisitingCard && (
                          <button
                            onClick={() => onSelectVisitingCard(emp)}
                            title="Generate Official Visiting Card for this employee"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] border border-[#DDEAE2] text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            <CreditCard className="w-3 h-3 text-[#45C512]" />
                            Visiting Card
                          </button>
                        )}
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          title="View Profile"
                          className="p-1.5 rounded-lg text-[#706161] hover:text-[#162E3D] hover:bg-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          title="Edit Record"
                          className="p-1.5 rounded-lg text-[#706161] hover:text-[#162E3D] hover:bg-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingEmployee(emp)}
                          title="Delete Employee"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {(isAddModalOpen || editingEmployee) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162E3D]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-by-lg border border-[#DDEAE2] overflow-hidden">
            <div className="px-6 py-4 bg-[#162E3D] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif uppercase tracking-wider">
                {editingEmployee ? "Edit Employee Record" : "Add New Employee"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div className="p-3 bg-[#EEFCD9] rounded-xl border border-[#45C512]/50 text-xs text-[#234404] flex items-center gap-2.5">
                <Key className="w-4 h-4 text-[#3c7809] flex-shrink-0" />
                <span>
                  <strong>Portal Login Info:</strong> Employees log in using their unique <strong>Employee ID</strong> (e.g. BYT-108) and Portal Password. No email ID required!
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Arun Kumar"
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Work Email <span className="text-[#706161] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Optional (not needed for login)"
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#162E3D]">
                      Designation *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomDesignation(!customDesignation)}
                      className="text-[10px] text-[#2c5306] font-semibold hover:underline cursor-pointer"
                    >
                      {customDesignation ? "Choose standard role" : "Custom role"}
                    </button>
                  </div>
                  {customDesignation ? (
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Lead Strategist"
                      className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D]"
                    />
                  ) : (
                    <select
                      required
                      value={formData.designation}
                      onChange={(e) => {
                        const des = e.target.value;
                        const suggestedDept = (DESIGNATION_DEPARTMENT_MAP as any)[des];
                        setFormData({
                          ...formData,
                          designation: des,
                          department: suggestedDept || formData.department,
                        });
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-medium text-[#162E3D]"
                    >
                      <option value="">Select Official Designation...</option>
                      {AGENCY_DESIGNATIONS.map((des) => (
                        <option key={des} value={des}>
                          {des}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Portal Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="password123"
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  >
                    <option value="active">Active (Can Log In)</option>
                    <option value="inactive">Inactive (Login Blocked)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Annual CTC (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.annualSalary}
                    onChange={(e) => {
                      const annual = Number(e.target.value);
                      setFormData({
                        ...formData,
                        annualSalary: annual,
                        monthlySalary: Math.round(annual / 12),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.monthlySalary}
                    onChange={(e) => {
                      const monthly = Number(e.target.value);
                      setFormData({
                        ...formData,
                        monthlySalary: monthly,
                        annualSalary: monthly * 12,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Residential Address (For Letter Of Offer &amp; Vault)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Address Line 1 (Door No / Street / Flat)"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                    />
                    <input
                      type="text"
                      placeholder="Address Line 2 (Area / Locality)"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                    />
                    <input
                      type="text"
                      placeholder="City, State - Pincode (e.g. Chennai, Tamil Nadu - 600030)"
                      value={formData.cityStatePin}
                      onChange={(e) => setFormData({ ...formData, cityStatePin: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#DDEAE2]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#706161] hover:text-[#162E3D] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting
                    ? "Saving..."
                    : editingEmployee
                    ? "Update Employee"
                    : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162E3D]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-by-lg border border-[#DDEAE2] overflow-hidden">
            <div className="p-6 bg-[#162E3D] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    viewingEmployee.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      viewingEmployee.name
                    )}&backgroundColor=331e1e&textColor=a2fc4b`
                  }
                  alt={viewingEmployee.name}
                  className="w-12 h-12 rounded-full border-2 border-[#45C512] object-cover"
                />
                <div>
                  <h3 className="text-base font-bold text-white font-serif">
                    {viewingEmployee.name}
                  </h3>
                  <div className="text-xs text-[#45C512] font-mono">
                    {viewingEmployee.empId} • {viewingEmployee.designation}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingEmployee(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#DDEAE2]">
                <div>
                  <span className="text-[#706161] block mb-0.5">Department</span>
                  <span className="font-bold text-[#162E3D]">{viewingEmployee.department}</span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                      viewingEmployee.status === "active"
                        ? "bg-[#EEFCD9] text-[#2c5306]"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {viewingEmployee.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Work Email</span>
                  <span className="font-semibold text-[#162E3D] break-all">{viewingEmployee.email}</span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Phone</span>
                  <span className="font-semibold text-[#162E3D]">{viewingEmployee.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Date of Joining</span>
                  <span className="font-semibold text-[#162E3D]">{viewingEmployee.dateOfJoining}</span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Portal Password</span>
                  <span className="font-mono px-2 py-0.5 bg-[#F5F9F7] rounded border border-[#DDEAE2] text-[#162E3D]">
                    {viewingEmployee.password}
                  </span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Date of Birth (DOB)</span>
                  <span className="font-semibold text-[#162E3D]">{viewingEmployee.dob || "—"}</span>
                </div>
                <div>
                  <span className="text-[#706161] block mb-0.5">Annual CTC</span>
                  <span className="font-semibold text-[#162E3D]">
                    {viewingEmployee.annualSalary ? `₹${viewingEmployee.annualSalary.toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#706161] block mb-0.5">Residential Address</span>
                  <span className="font-medium text-[#162E3D]">
                    {[viewingEmployee.addressLine1, viewingEmployee.addressLine2, viewingEmployee.cityStatePin]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    const emp = viewingEmployee;
                    setViewingEmployee(null);
                    setOfferLetterTargetEmp(emp);
                    setIsOfferModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#EEFCD9] hover:bg-[#d8f99e] text-[#1E3A06] border border-[#45C512] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Letter Of Offer Studio
                </button>
                <button
                  onClick={() => {
                    const emp = viewingEmployee;
                    setViewingEmployee(null);
                    openEditModal(emp);
                  }}
                  className="px-4 py-2 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold rounded-xl cursor-pointer text-xs"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162E3D]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-by-lg border border-[#DDEAE2] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-[#162E3D]">Confirm Deletion</h3>
              <p className="text-xs text-[#706161] mt-1">
                Are you sure you want to remove{" "}
                <span className="font-bold text-[#162E3D]">{deletingEmployee.name}</span> (
                {deletingEmployee.empId})? This will revoke their portal access immediately.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingEmployee(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold text-[#706161] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Delete Record"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFER LETTER STUDIO MODAL */}
      <OfferLetterModal
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setOfferLetterTargetEmp(null);
        }}
        initialEmployee={offerLetterTargetEmp}
        employees={employees}
        onSavedToVault={fetchEmployees}
      />
    </div>
  );
}
