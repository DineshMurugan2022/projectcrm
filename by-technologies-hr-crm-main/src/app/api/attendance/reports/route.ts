import { NextRequest, NextResponse } from "next/server";
import {
  getSavedReportsInFolder,
  saveReportStreamToFolder,
  deleteSavedReport,
  REPORTS_BASE_DIR,
} from "@/lib/excelReport";

// GET: List all saved reports in folders
export async function GET() {
  try {
    const reports = getSavedReportsInFolder();
    return NextResponse.json({
      success: true,
      reports,
      baseFolder: REPORTS_BASE_DIR,
      totalCount: reports.length,
    });
  } catch (error) {
    console.error("GET reports error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list saved reports" },
      { status: 500 }
    );
  }
}

// POST: Generate report and save as stream into folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = body.month || currentYearMonth;
    const format = body.format === "csv" ? "csv" : "excel";
    const subFolder = body.folder;

    const reportMeta = await saveReportStreamToFolder(month, format, subFolder);

    return NextResponse.json({
      success: true,
      message: `Successfully streamed and saved ${format.toUpperCase()} attendance report to folder`,
      report: reportMeta,
    });
  } catch (error) {
    console.error("POST report save error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to stream and save report to folder" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a saved report from folder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File relative path is required" },
        { status: 400 }
      );
    }

    const deleted = deleteSavedReport(file);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Report file not found or could not be removed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Saved report deleted successfully from folder",
    });
  } catch (error) {
    console.error("DELETE report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete saved report" },
      { status: 500 }
    );
  }
}
