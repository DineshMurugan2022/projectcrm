import { NextRequest, NextResponse } from "next/server";
import {
  generateExcelXml,
  generateCsvContent,
  saveReportStreamToFolder,
} from "@/lib/excelReport";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") || currentYearMonth; // e.g. "2026-09"
    const format = searchParams.get("format") || "excel"; // "excel" | "csv"
    const saveToFolder = searchParams.get("save") === "true";

    // Auto-save to server folder stream if requested
    if (saveToFolder) {
      try {
        await saveReportStreamToFolder(month, format === "csv" ? "csv" : "excel");
      } catch (saveErr) {
        console.warn("Could not auto-save export to folder:", saveErr);
      }
    }

    if (format === "csv") {
      const { csv, fileName } = generateCsvContent(month);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Default: Native XML Spreadsheet 2003 (.xls)
    const { xml, fileName } = generateExcelXml(month);
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Attendance export stream error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate attendance report stream" },
      { status: 500 }
    );
  }
}
