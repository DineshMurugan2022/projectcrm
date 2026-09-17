"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Employee, UserRole } from "@/lib/types";

interface AuthContextType {
  role: UserRole | null;
  employee: Employee | null;
  adminName: string | null;
  loading: boolean;
  loginAdmin: (password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  loginEmployee: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole, sampleEmployeeId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem("by_crm_role") as UserRole | null;
      if (savedRole === "admin") {
        setRole("admin");
        setAdminName(localStorage.getItem("by_crm_admin_name") || "HR Administrator");
      } else if (savedRole === "employee") {
        const savedEmp = localStorage.getItem("by_crm_employee");
        if (savedEmp) {
          setRole("employee");
          setEmployee(JSON.parse(savedEmp));
        }
      }
    } catch (e) {
      console.error("Failed to restore session:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAdmin = async (password: string, username = "admin") => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setRole("admin");
        setAdminName(data.adminName || "HR Administrator");
        setEmployee(null);
        localStorage.setItem("by_crm_role", "admin");
        localStorage.setItem("by_crm_admin_name", data.adminName || "HR Administrator");
        localStorage.removeItem("by_crm_employee");
        return { success: true };
      } else {
        return { success: false, error: data.error || "Authentication failed" };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const loginEmployee = async (identifier: string, password: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "employee", identifier, password }),
      });
      const data = await res.json();
      if (data.success) {
        setRole("employee");
        setEmployee(data.employee);
        setAdminName(null);
        localStorage.setItem("by_crm_role", "employee");
        localStorage.setItem("by_crm_employee", JSON.stringify(data.employee));
        localStorage.removeItem("by_crm_admin_name");
        return { success: true };
      } else {
        return { success: false, error: data.error || "Authentication failed" };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const logout = () => {
    setRole(null);
    setEmployee(null);
    setAdminName(null);
    localStorage.removeItem("by_crm_role");
    localStorage.removeItem("by_crm_employee");
    localStorage.removeItem("by_crm_admin_name");
  };

  // Helper for quick testing/switching between roles
  const switchRole = async (targetRole: UserRole, sampleEmployeeId?: string) => {
    if (targetRole === "admin") {
      await loginAdmin("admin123", "admin");
    } else {
      // Fetch employee
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        if (data.success && data.employees.length > 0) {
          const target = sampleEmployeeId
            ? data.employees.find((e: Employee) => e.id === sampleEmployeeId || e.empId === sampleEmployeeId)
            : data.employees.find((e: Employee) => e.status === "active");
          if (target) {
            await loginEmployee(target.empId, target.password || "password123");
          }
        }
      } catch (err) {
        console.error("Error switching role:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        employee,
        adminName,
        loading,
        loginAdmin,
        loginEmployee,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
