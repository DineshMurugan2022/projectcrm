import { NextRequest, NextResponse } from "next/server";
import { getJobs, saveJob, deleteJob } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const jobs = getJobs();
    const existing = jobs.find((j) => j.id === id);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = {
      ...existing,
      ...body,
      id: existing.id,
      openingsCount: body.openingsCount !== undefined ? Number(body.openingsCount) : existing.openingsCount,
      updatedAt: new Date().toISOString(),
    };

    saveJob(updated);

    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error("PUT /api/jobs/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = deleteJob(id);
    if (!success) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete job" }, { status: 500 });
  }
}
