import { NextRequest, NextResponse } from "next/server";
import {
  readDatabase,
  getEmployeeByIdentifier,
  addLoginLog,
  getAttendance,
  saveAttendance,
  formatDate,
} from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, username, email, identifier, employeeId, password } = body;

    const db = readDatabase();

    if (role === "admin") {
      if (
        (username?.trim().toLowerCase() === db.admin.name.toLowerCase() ||
          identifier?.trim().toLowerCase() === db.admin.name.toLowerCase()) &&
        password === db.admin.password
      ) {
        return NextResponse.json({
          success: true,
          role: "admin",
          adminName: "HR Administrator",
        });
      } else {
        return NextResponse.json(
          { success: false, error: "Invalid admin username or password" },
          { status: 401 }
        );
      }
    } else if (role === "employee") {
      const loginQuery = (identifier || employeeId || username || email || "").trim();

      if (!loginQuery || !password) {
        return NextResponse.json(
          { success: false, error: "Employee ID (or Name) and portal password are required" },
          { status: 400 }
        );
      }

      const employee = getEmployeeByIdentifier(loginQuery);

      if (!employee) {
        return NextResponse.json(
          {
            success: false,
            error: `No employee record found for "${loginQuery}". Please ensure your Employee ID is correct or contact HR.`,
          },
          { status: 404 }
        );
      }

      // Check if employee status is active
      if (employee.status !== "active") {
        return NextResponse.json(
          {
            success: false,
            error: `This employee account (${employee.empId} - ${employee.name}) is currently marked INACTIVE. Access denied. Please contact HR Administration.`,
          },
          { status: 403 }
        );
      }

      if (employee.password !== password) {
        return NextResponse.json(
          { success: false, error: "Incorrect portal password" },
          { status: 401 }
        );
      }

      // Timestamp & log this employee login as required
      const forwardedFor = request.headers.get("x-forwarded-for");
      const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
      const userAgent = request.headers.get("user-agent") || "Web Browser";

      const log = addLoginLog({
        employeeId: employee.id,
        empId: employee.empId,
        employeeName: employee.name,
        email: employee.email || "",
        loginTime: new Date().toISOString(),
        ipAddress,
        userAgent,
      });

      // Automatically register today's attendance check-in if not already recorded
      const now = new Date();
      const todayStr = formatDate(now);
      const existingRecords = getAttendance({ date: todayStr, employeeId: employee.id });
      let todayAttendance = existingRecords.length > 0 ? existingRecords[0] : null;

      if (!todayAttendance || !todayAttendance.checkInTime) {
        const timeStr = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // 9:30 AM login expected; if login after 10:30 AM -> Late, otherwise Present
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const isLate = hours > 10 || (hours === 10 && minutes > 30);
        const status = isLate ? "Late" : "Present";

        todayAttendance = {
          id: todayAttendance ? todayAttendance.id : `att_${Date.now()}_${employee.id}`,
          employeeId: employee.id,
          date: todayStr,
          status,
          workType: todayAttendance?.workType || "Office",
          checkInTime: timeStr,
          checkOutTime: todayAttendance?.checkOutTime || "",
          notes: todayAttendance?.notes || "Portal Login Check-In",
          createdAt: todayAttendance ? todayAttendance.createdAt : now.toISOString(),
          updatedAt: now.toISOString(),
        };
        saveAttendance(todayAttendance);
      }

      // Remove sensitive password from returned payload
      const { password: _, ...safeEmployee } = employee;

      return NextResponse.json({
        success: true,
        role: "employee",
        employee: safeEmployee,
        loginLogId: log.id,
        attendance: todayAttendance,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid login mode" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
