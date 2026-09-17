import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import {
  WORKSPACE_BASE_DIR,
  generateEmployeeMasterExcel,
  generateAppointmentLetterWord,
  generateOfferLetterWord,
  generateOfferLetterHtml,
  generateEmployeeDossierWord,
  generateNdaAgreementWord,
  OfferLetterData,
} from "@/lib/hrDocuments";
import { getEmployees } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");
    const generate = searchParams.get("generate");
    const empId = searchParams.get("empId") || undefined;
    const format = searchParams.get("format") || searchParams.get("view");

    // Mode 1: Stream directly generated document
    if (generate) {
      const genType = generate.toLowerCase().replace(/-/g, "_");
      if (genType === "master_roster" || genType === "excel_master" || genType === "master_excel") {
        const { xml, fileName } = generateEmployeeMasterExcel();
        return new NextResponse(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.ms-excel; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Cache-Control": "no-cache",
          },
        });
      }

      const employees = getEmployees();
      const emp = employees.find((e) => e.empId === empId || e.id === empId) || employees[0];

      // Custom parameters for offer letter if provided
      const customOfferData: Partial<OfferLetterData> = {};
      if (searchParams.get("candidateName")) customOfferData.candidateName = searchParams.get("candidateName")!;
      if (searchParams.get("designation")) customOfferData.designation = searchParams.get("designation")!;
      if (searchParams.get("empId")) customOfferData.empId = searchParams.get("empId")!;
      if (searchParams.get("dob")) customOfferData.dob = searchParams.get("dob")!;
      if (searchParams.get("addressLine1")) customOfferData.addressLine1 = searchParams.get("addressLine1")!;
      if (searchParams.get("addressLine2")) customOfferData.addressLine2 = searchParams.get("addressLine2")!;
      if (searchParams.get("cityStatePin")) customOfferData.cityStatePin = searchParams.get("cityStatePin")!;
      if (searchParams.get("doj")) customOfferData.dateOfJoining = searchParams.get("doj")!;
      if (searchParams.get("offerDate")) customOfferData.offerDate = searchParams.get("offerDate")!;
      if (searchParams.get("annualSalary")) customOfferData.annualSalary = Number(searchParams.get("annualSalary"));
      if (searchParams.get("monthlySalary")) customOfferData.monthlySalary = Number(searchParams.get("monthlySalary"));
      if (searchParams.get("annualSalaryWords")) customOfferData.annualSalaryWords = searchParams.get("annualSalaryWords")!;
      if (searchParams.get("signatoryName")) customOfferData.signatoryName = searchParams.get("signatoryName")!;
      if (searchParams.get("signatoryTitle")) customOfferData.signatoryTitle = searchParams.get("signatoryTitle")!;
      if (searchParams.get("workTimings")) customOfferData.workTimings = searchParams.get("workTimings")!;

      // HTML preview requested
      if (format === "html" && (genType === "offer_letter" || genType === "appointment_letter")) {
        const html = generateOfferLetterHtml({ emp, ...customOfferData }, false);
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      }

      let doc = "";
      let fileName = "";

      if (genType === "offer_letter" || genType === "appointment_letter") {
        const res = generateOfferLetterWord({ emp, ...customOfferData });
        doc = res.doc;
        fileName = res.fileName;
      } else if (genType === "employee_dossier") {
        const res = generateEmployeeDossierWord(emp);
        doc = res.doc;
        fileName = res.fileName;
      } else if (genType === "nda_agreement") {
        const res = generateNdaAgreementWord(emp);
        doc = res.doc;
        fileName = res.fileName;
      }

      return new NextResponse(doc, {
        status: 200,
        headers: {
          "Content-Type": "application/msword; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    // Mode 2: Stream existing file from workspace directory
    if (!file) {
      return new NextResponse("File or generate parameter required", { status: 400 });
    }

    const resolvedPath = path.resolve(WORKSPACE_BASE_DIR, file);
    if (
      !resolvedPath.startsWith(path.resolve(WORKSPACE_BASE_DIR)) ||
      !fs.existsSync(resolvedPath)
    ) {
      return new NextResponse("Document not found", { status: 404 });
    }

    const fileName = path.basename(resolvedPath);
    const isExcel = fileName.endsWith(".xls");
    const contentType = isExcel
      ? "application/vnd.ms-excel; charset=utf-8"
      : "application/msword; charset=utf-8";

    const nodeStream = fs.createReadStream(resolvedPath);
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Workspace download error:", error);
    return new NextResponse("Failed to stream document", { status: 500 });
  }
}
