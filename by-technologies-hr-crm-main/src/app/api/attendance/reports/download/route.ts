import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { REPORTS_BASE_DIR } from "@/lib/excelReport";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return new NextResponse("File parameter is required", { status: 400 });
    }

    const resolvedPath = path.resolve(REPORTS_BASE_DIR, file);

    // Security check against directory traversal
    if (
      !resolvedPath.startsWith(path.resolve(REPORTS_BASE_DIR)) ||
      !fs.existsSync(resolvedPath)
    ) {
      return new NextResponse("File not found or access denied", { status: 404 });
    }

    const fileName = path.basename(resolvedPath);
    const isExcel = fileName.endsWith(".xls");
    const contentType = isExcel
      ? "application/vnd.ms-excel; charset=utf-8"
      : "text/csv; charset=utf-8";

    // Stream the file directly from folder to client
    const nodeStream = fs.createReadStream(resolvedPath);
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Report download stream error:", error);
    return new NextResponse("Failed to stream report file", { status: 500 });
  }
}
