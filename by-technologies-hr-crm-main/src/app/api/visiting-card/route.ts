import { NextRequest, NextResponse } from "next/server";
import { getEmployeeByIdAsync, saveEmployeeVisitingCardAsync } from "@/lib/db";
import { VisitingCardData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "employeeId is required" },
        { status: 400 }
      );
    }
    const employee = await getEmployeeByIdAsync(employeeId);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }
    const cardData: VisitingCardData = employee.visitingCard || {
      name: employee.name,
      designation: employee.designation,
      phone: employee.phone || "+91 7824878137",
      email: employee.email || "info@bnytechnologies.com",
      website: "www.bnytechnologies.com",
      address: "No.624, Khivraj Building, 3rdFloor, Anna Salai, Chennai - 600006.",
    };
    return NextResponse.json(
      { success: true, cardData, employee },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get visiting card data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, cardData } = body;
    if (!employeeId || !cardData) {
      return NextResponse.json(
        { success: false, error: "employeeId and cardData are required" },
        { status: 400 }
      );
    }
    const success = await saveEmployeeVisitingCardAsync(employeeId, cardData);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to save visiting card data" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Visiting card saved successfully",
      cardData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to save visiting card" },
      { status: 500 }
    );
  }
}
