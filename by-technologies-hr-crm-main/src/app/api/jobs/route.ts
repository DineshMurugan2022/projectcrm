import { NextRequest, NextResponse } from "next/server";
import { getJobs, saveJob } from "@/lib/db";
import { JobOpening } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    let list = getJobs();

    if (department && department !== "All") {
      list = list.filter((j) => j.department === department);
    }

    if (status && status !== "All") {
      list = list.filter((j) => j.status === status);
    }

    return NextResponse.json({ success: true, jobs: list });
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      department,
      openingsCount = 1,
      status = "open",
      experience = "1-3 years",
      jobType = "Full-time",
      description = "",
      requirements = [],
    } = body;

    if (!title || !department) {
      return NextResponse.json(
        { success: false, error: "Title and department are required" },
        { status: 400 }
      );
    }

    const newJob: JobOpening = {
      id: `job_${Date.now()}`,
      title: title.trim(),
      department: department.trim(),
      openingsCount: Number(openingsCount) || 1,
      status: status === "closed" ? "closed" : "open",
      postedDate: new Date().toISOString().split("T")[0],
      experience: experience.trim(),
      jobType: jobType || "Full-time",
      description: description.trim(),
      requirements: Array.isArray(requirements) ? requirements : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveJob(newJob);

    return NextResponse.json({ success: true, job: newJob }, { status: 201 });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create job" },
      { status: 500 }
    );
  }
}
