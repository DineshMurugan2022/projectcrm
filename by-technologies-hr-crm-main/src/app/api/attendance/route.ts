import { NextRequest, NextResponse } from "next/server";
import { getAttendance, saveAttendance, getEmployees } from "@/lib/db";
import { Attendance, AttendanceStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const month = searchParams.get("month") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;

    const list = getAttendance({ date, month, employeeId });
    return NextResponse.json({ success: true, attendance: list });
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Batch mark present for all active employees without attendance on a given date
    if (action === "mark-all-present") {
      const { date } = body;
      if (!date) {
        return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });
      }

      const employees = getEmployees().filter((e) => e.status === "active");
      const currentRecords = getAttendance({ date });
      const markedIds = new Set(currentRecords.map((r) => r.employeeId));

      const updatedList: Attendance[] = [];
      for (const emp of employees) {
        if (!markedIds.has(emp.id)) {
          const record: Attendance = {
            id: `att_${Date.now()}_${emp.id}`,
            employeeId: emp.id,
            date,
            status: "Present",
            checkInTime: "09:30 AM",
            checkOutTime: "06:30 PM",
            notes: "Auto-marked by Admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveAttendance(record);
          updatedList.push(record);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${updatedList.length} employees as present`,
        records: updatedList,
      });
    }

    // Single check-in / check-out / admin attendance update
    const {
      employeeId,
      date,
      status = "Present",
      workType,
      checkInTime,
      checkOutTime,
      notes,
    } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { success: false, error: "employeeId and date are required" },
        { status: 400 }
      );
    }

    const existingList = getAttendance({ date, employeeId });
    const existing = existingList.length > 0 ? existingList[0] : null;

    const record: Attendance = {
      id: existing ? existing.id : `att_${Date.now()}_${employeeId}`,
      employeeId,
      date,
      status: (status as AttendanceStatus) || (existing ? existing.status : "Present"),
      workType: workType !== undefined ? workType : existing?.workType || "Office",
      checkInTime: checkInTime !== undefined ? checkInTime : existing?.checkInTime,
      checkOutTime: checkOutTime !== undefined ? checkOutTime : existing?.checkOutTime,
      notes: notes !== undefined ? notes : existing?.notes,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAttendance(record);

    return NextResponse.json({ success: true, attendance: record });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
