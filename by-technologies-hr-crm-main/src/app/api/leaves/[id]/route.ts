import { NextRequest, NextResponse } from "next/server";
import { getLeaves, saveLeave, saveAttendance, getAttendance } from "@/lib/db";
import { Attendance } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewNote } = body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Valid status ('Approved' or 'Rejected') is required" },
        { status: 400 }
      );
    }

    const leaves = getLeaves();
    const targetLeave = leaves.find((l) => l.id === id);

    if (!targetLeave) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const updatedLeave = {
      ...targetLeave,
      status: status as "Approved" | "Rejected",
      reviewedAt: new Date().toISOString(),
      reviewNote: reviewNote || (status === "Approved" ? "Approved by HR" : "Rejected by HR"),
    };

    saveLeave(updatedLeave);

    // If approved, sync attendance for the date range
    if (status === "Approved") {
      const start = new Date(targetLeave.fromDate);
      const end = new Date(targetLeave.toDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const existingList = getAttendance({ date: dateStr, employeeId: targetLeave.employeeId });
        const existing = existingList.length > 0 ? existingList[0] : null;

        const attRecord: Attendance = {
          id: existing ? existing.id : `att_${Date.now()}_${targetLeave.employeeId}_${dateStr}`,
          employeeId: targetLeave.employeeId,
          date: dateStr,
          status: targetLeave.leaveType === "Half Day Leave" ? "Half day" : "Absent",
          checkInTime: "",
          checkOutTime: "",
          notes: `Approved Leave (${targetLeave.leaveType})`,
          createdAt: existing ? existing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveAttendance(attRecord);
      }
    }

    return NextResponse.json({ success: true, leave: updatedLeave });
  } catch (error) {
    console.error("PATCH /api/leaves/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update leave request" },
      { status: 500 }
    );
  }
}
