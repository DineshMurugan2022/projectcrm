"use client";

import React, { useState, useEffect } from "react";
import { JobOpening } from "@/lib/types";
import {
  AGENCY_DESIGNATIONS,
  DESIGNATION_DEPARTMENT_MAP,
} from "@/lib/designations";
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Users,
  Search,
  Filter,
  X,
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function RecruitmentSection() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobOpening | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    department: "SEO & Organic Growth",
    openingsCount: 1,
    status: "open" as "open" | "closed",
    experience: "2-4 years",
    jobType: "Full-time" as "Full-time" | "Hybrid" | "Remote" | "Internship",
    description: "",
    requirementsText: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openAddModal = () => {
    setFormData({
      title: "",
      department: "SEO & Organic Growth",
      openingsCount: 1,
      status: "open",
      experience: "2-4 years",
      jobType: "Full-time",
      description: "",
      requirementsText: "",
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (job: JobOpening) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      department: job.department,
      openingsCount: job.openingsCount,
      status: job.status,
      experience: job.experience,
      jobType: job.jobType,
      description: job.description,
      requirementsText: (job.requirements || []).join("\n"),
    });
    setFormError(null);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const requirements = formData.requirementsText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      if (editingJob) {
        // PUT
        const res = await fetch(`/api/jobs/${editingJob.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            department: formData.department,
            openingsCount: formData.openingsCount,
            status: formData.status,
            experience: formData.experience,
            jobType: formData.jobType,
            description: formData.description,
            requirements,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingJob(null);
          fetchJobs();
        } else {
          setFormError(data.error || "Failed to update job opening");
        }
      } else {
        // POST
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            department: formData.department,
            openingsCount: formData.openingsCount,
            status: formData.status,
            experience: formData.experience,
            jobType: formData.jobType,
            description: formData.description,
            requirements,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setIsAddModalOpen(false);
          fetchJobs();
        } else {
          setFormError(data.error || "Failed to create job opening");
        }
      }
    } catch (err: any) {
      setFormError(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (job: JobOpening) => {
    const nextStatus = job.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
      }
    } catch (err) {
      console.error("Toggle job status error:", err);
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    try {
      const res = await fetch(`/api/jobs/${deletingJob.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeletingJob(null);
        fetchJobs();
      }
    } catch (err) {
      console.error("Delete job error:", err);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === "All" || job.department === deptFilter;
    const matchesStatus = statusFilter === "All" || job.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const openCount = jobs.filter((j) => j.status === "open").length;
  const closedCount = jobs.filter((j) => j.status === "closed").length;
  const totalOpeningsNeeded = jobs
    .filter((j) => j.status === "open")
    .reduce((sum, j) => sum + j.openingsCount, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#234404]">{openCount}</div>
            <div className="text-xs text-[#706161]">Active Job Postings</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EEFCD9] text-[#2c5306] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#162E3D]">{totalOpeningsNeeded}</div>
            <div className="text-xs text-[#706161]">Total Positions to Hire</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#162E3D] text-[#45C512] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDEAE2] shadow-by flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#706161]">{closedCount}</div>
            <div className="text-xs text-[#706161]">Filled / Closed Postings</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F5F9F7] text-[#706161] border border-[#DDEAE2] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDEAE2] shadow-by space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#162E3D]">Recruitment &amp; Vacancies</h2>
            <p className="text-xs text-[#706161]">
              Manage job titles, openings counts, department requirements, and posting statuses.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#162E3D] hover:bg-[#244254] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#45C512]" />
            Post New Opening
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#706161] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search job title or keywords..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="open">Open Only</option>
              <option value="closed">Closed Only</option>
            </select>
            <button
              onClick={fetchJobs}
              className="p-2 bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl text-[#706161] hover:text-[#162E3D] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Job Openings Grid */}
      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-[#DDEAE2] text-center text-xs text-[#706161]">
          Loading recruitment listings...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-[#DDEAE2] text-center text-xs text-[#706161]">
          No job openings found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-5 rounded-2xl border border-[#DDEAE2] shadow-by flex flex-col justify-between hover:border-[#45C512]/60 transition-all group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#706161]">
                      {job.department}
                    </span>
                    <h3 className="text-sm font-bold text-[#162E3D] mt-0.5 group-hover:text-[#234404] transition-colors">
                      {job.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(job)}
                    title="Click to toggle Open / Closed"
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                      job.status === "open"
                        ? "bg-[#EEFCD9] text-[#2c5306] border-[#45C512]/60 hover:bg-[#d8f7a8]"
                        : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {job.status === "open" ? "● OPEN" : "○ CLOSED"}
                  </button>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-[#F5F9F7] border border-[#DDEAE2] font-semibold text-[#162E3D]">
                    👥 {job.openingsCount} {job.openingsCount === 1 ? "opening" : "openings"}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#F5F9F7] border border-[#DDEAE2] text-[#706161]">
                    💼 {job.jobType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#F5F9F7] border border-[#DDEAE2] text-[#706161]">
                    🎯 {job.experience}
                  </span>
                  <span className="text-[10px] text-[#706161] ml-auto font-mono">
                    Posted: {job.postedDate}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[#706161] line-clamp-3 mb-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Requirements Pills */}
                {job.requirements && job.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.requirements.slice(0, 3).map((req, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#F5F9F7] text-[#162E3D] border border-[#DDEAE2] truncate max-w-full"
                      >
                        ✓ {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDEAE2]">
                <button
                  onClick={() => openEditModal(job)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#162E3D] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-xl transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Opening
                </button>
                <button
                  onClick={() => setDeletingJob(job)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete job posting"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT JOB OPENING MODAL */}
      {(isAddModalOpen || editingJob) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162E3D]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-by-lg border border-[#DDEAE2] overflow-hidden">
            <div className="px-6 py-4 bg-[#162E3D] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif uppercase tracking-wider">
                {editingJob ? "Edit Job Opening" : "Post New Job Opening"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingJob(null);
                }}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#162E3D]">
                    Job Title / Role *
                  </label>
                  <span className="text-[10px] text-[#706161]">
                    Pick or type custom role
                  </span>
                </div>
                <input
                  type="text"
                  required
                  list="agency-designations-list"
                  value={formData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const matchingDept = (DESIGNATION_DEPARTMENT_MAP as any)[title];
                    setFormData({
                      ...formData,
                      title,
                      department: matchingDept || formData.department,
                    });
                  }}
                  placeholder="e.g. FullStack Developer, BDM, UI/UX Developer..."
                  className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D]"
                />
                <datalist id="agency-designations-list">
                  {AGENCY_DESIGNATIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {AGENCY_DESIGNATIONS.slice(0, 7).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const matchingDept = (DESIGNATION_DEPARTMENT_MAP as any)[d];
                        setFormData({
                          ...formData,
                          title: d,
                          department: matchingDept || formData.department,
                        });
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] border border-[#DDEAE2] transition-colors cursor-pointer"
                    >
                      + {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Number of Openings *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={formData.openingsCount}
                    onChange={(e) =>
                      setFormData({ ...formData, openingsCount: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Job Type
                  </label>
                  <select
                    value={formData.jobType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jobType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#162E3D] mb-1">
                    Experience Required
                  </label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 3-5 years"
                    className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "open" | "closed" })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                >
                  <option value="open">Open (Accepting Applicants)</option>
                  <option value="closed">Closed (Position Filled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1">
                  Job Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summarize key responsibilities and campaign ownership..."
                  className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1">
                  Key Requirements (One per line)
                </label>
                <textarea
                  rows={3}
                  value={formData.requirementsText}
                  onChange={(e) => setFormData({ ...formData, requirementsText: e.target.value })}
                  placeholder="3+ years scaling ad campaigns&#10;Expertise in GA4 and CRO&#10;Excellent communication skills"
                  className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#DDEAE2]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingJob(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#706161] hover:text-[#162E3D] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingJob ? "Update Opening" : "Publish Opening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162E3D]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-by-lg border border-[#DDEAE2] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-[#162E3D]">Delete Opening</h3>
              <p className="text-xs text-[#706161] mt-1">
                Are you sure you want to remove{" "}
                <span className="font-bold text-[#162E3D]">{deletingJob.title}</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingJob(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#706161] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
