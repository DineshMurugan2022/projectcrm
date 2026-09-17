import { NextRequest, NextResponse } from "next/server";
import {
  getEmployeeByIdAsync,
  saveEmployeeAsync,
  deleteEmployeeAsync,
  getEmployeeByEmail,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const employee = await getEmployeeByIdAsync(id);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, employee },
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
      { success: false, error: "Failed to get employee" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await getEmployeeByIdAsync(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      designation,
      department,
      dateOfJoining,
      status,
      password,
      avatarUrl,
      dob,
      addressLine1,
      addressLine2,
      cityStatePin,
      annualSalary,
      monthlySalary,
      workTimings,
      signatoryName,
      signatoryTitle,
    } = body;

    if (email && existing.email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = getEmployeeByEmail(email);
      if (emailTaken && emailTaken.id !== existing.id) {
        return NextResponse.json(
          { success: false, error: "Email already taken by another employee" },
          { status: 409 }
        );
      }
    }

    const updated = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      email: email !== undefined ? (email ? email.trim().toLowerCase() : "") : existing.email,
      phone: phone !== undefined ? phone.trim() : existing.phone,
      designation: designation !== undefined ? designation.trim() : existing.designation,
      department: department !== undefined ? department.trim() : existing.department,
      dateOfJoining: dateOfJoining !== undefined ? dateOfJoining : existing.dateOfJoining,
      status: status !== undefined ? status : existing.status,
      password: password !== undefined && password !== "" ? password : existing.password,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : existing.avatarUrl,
      dob: dob !== undefined ? dob : existing.dob,
      addressLine1: addressLine1 !== undefined ? addressLine1 : existing.addressLine1,
      addressLine2: addressLine2 !== undefined ? addressLine2 : existing.addressLine2,
      cityStatePin: cityStatePin !== undefined ? cityStatePin : existing.cityStatePin,
      annualSalary: annualSalary !== undefined ? Number(annualSalary) : existing.annualSalary,
      monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : existing.monthlySalary,
      workTimings: workTimings !== undefined ? workTimings : existing.workTimings,
      signatoryName: signatoryName !== undefined ? signatoryName : existing.signatoryName,
      signatoryTitle: signatoryTitle !== undefined ? signatoryTitle : existing.signatoryTitle,
    };

    await saveEmployeeAsync(updated);

    return NextResponse.json(
      { success: true, employee: updated },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("PUT employee error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteEmployeeAsync(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Employee not found or could not be deleted" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, message: "Employee deleted successfully" },
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
      { success: false, error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
