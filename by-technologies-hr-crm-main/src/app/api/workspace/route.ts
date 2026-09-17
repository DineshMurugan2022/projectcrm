import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspaceFiles,
  saveWorkspaceDocumentStream,
  deleteWorkspaceFile,
  WORKSPACE_BASE_DIR,
} from "@/lib/hrDocuments";

// GET: List all files in HR workspace
export async function GET() {
  try {
    const files = getWorkspaceFiles();
    return NextResponse.json({
      success: true,
      files,
      baseDir: WORKSPACE_BASE_DIR,
      totalCount: files.length,
    });
  } catch (error) {
    console.error("GET workspace error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list workspace files" },
      { status: 500 }
    );
  }
}

// POST: Generate and stream document into workspace folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docType, empId, customOfferData } = body;

    if (!docType) {
      return NextResponse.json(
        { success: false, error: "docType is required" },
        { status: 400 }
      );
    }

    const fileMeta = await saveWorkspaceDocumentStream(docType, empId, customOfferData);

    return NextResponse.json({
      success: true,
      message: `Document streamed and saved to HR Workspace: ${fileMeta.fileName}`,
      file: fileMeta,
    });
  } catch (error) {
    console.error("POST workspace generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate workspace document" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a document from workspace
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "file relative path is required" },
        { status: 400 }
      );
    }

    const deleted = deleteWorkspaceFile(file);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "File not found or could not be removed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully from HR Workspace",
    });
  } catch (error) {
    console.error("DELETE workspace file error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
