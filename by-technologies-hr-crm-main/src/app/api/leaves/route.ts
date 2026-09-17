import { NextRequest, NextResponse } from "next/server";
import { getLeaves, saveLeave, getEmployeeById } from "@/lib/db";
import { LeaveRequest, LeaveType } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId") || undefined;
    const status = searchParams.get("status") || undefined;

    let list = getLeaves(employeeId);

    if (status && status !== "All") {
      list = list.filter((l) => l.status === status);
    }

    return NextResponse.json({ success: true, leaves: list });
  } catch (error) {
    console.error("GET /api/leaves error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, leaveType, fromDate, toDate, reason } = body;

    if (!employeeId || !leaveType || !fromDate || !toDate || !reason) {
      return NextResponse.json(
        { success: false, error: "All leave fields are required" },
        { status: 400 }
      );
    }

    const employee = getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Calculate days count
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (leaveType === "Half Day Leave") {
      days = 0.5;
    }

    const newLeave: LeaveRequest = {
      id: `lev_${Date.now()}`,
      employeeId,
      employeeName: employee.name,
      department: employee.department,
      leaveType: leaveType as LeaveType,
      fromDate,
      toDate,
      days,
      reason: reason.trim(),
      status: "Pending",
      appliedDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    saveLeave(newLeave);

    return NextResponse.json({ success: true, leave: newLeave }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leaves error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to apply for leave" },
      { status: 500 }
    );
  }
}
