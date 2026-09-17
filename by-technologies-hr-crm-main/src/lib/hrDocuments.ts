import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getEmployees, getAttendance, getLeaves } from "./db";
import { Employee } from "./types";

export const WORKSPACE_BASE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "workspace")
  : path.join(process.cwd(), "workspace");

export * from "./offerLetterUtils";
import {
  WorkspaceFileMetadata,
  OfferLetterData,
  formatIndianCurrency,
  numberToIndianWords,
  getDefaultSalaryForDesignation,
  escapeHtml,
  formatLongDate,
  formatSlashDate,
} from "./offerLetterUtils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ensureWorkspaceDirs() {
  const excelDir = path.join(WORKSPACE_BASE_DIR, "excel");
  const wordDir = path.join(WORKSPACE_BASE_DIR, "word");
  if (!fs.existsSync(excelDir)) fs.mkdirSync(excelDir, { recursive: true });
  if (!fs.existsSync(wordDir)) fs.mkdirSync(wordDir, { recursive: true });
}

// =========================================================================
// 1. EXCEL EMPLOYEE MASTER DATA WORKBOOK GENERATOR
// =========================================================================

export function generateEmployeeMasterExcel(): { xml: string; fileName: string } {
  const employees = getEmployees();
  const allAttendance = getAttendance();
  const allLeaves = getLeaves();
  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `BY_Technologies_Employee_Master_${dateStr}.xls`;

  // Calculate department distributions
  const deptCounts: Record<string, number> = {};
  employees.forEach((e) => {
    deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>B &amp; Y Technologies HR Admin</Author>
  <Company>B &amp; Y Technologies</Company>
  <Title>Employee Master Data Directory</Title>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="BrandTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Georgia" ss:Size="18" ss:Bold="1" ss:Color="#162E3D"/>
   <Interior ss:Color="#45C512" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#706161"/>
  </Style>
  <Style ss:ID="HeaderRow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A89898"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A89898"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#162E3D" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#162E3D"/>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="StatusActive">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#166534"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusInactive">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <!-- SHEET 1: EMPLOYEE MASTER ROSTER -->
 <Worksheet ss:Name="Employee Directory Master">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="90"/>
   <Column ss:Width="160"/>
   <Column ss:Width="180"/>
   <Column ss:Width="180"/>
   <Column ss:Width="110"/>
   <Column ss:Width="180"/>
   <Column ss:Width="100"/>
   <Column ss:Width="75"/>
   <Column ss:Width="120"/>

   <Row ss:Height="36">
    <Cell ss:MergeAcross="8" ss:StyleID="BrandTitle">
     <Data ss:Type="String">  B &amp; Y TECHNOLOGIES — EMPLOYEE MASTER DATA ROSTER</Data>
    </Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="8" ss:StyleID="SubTitle">
     <Data ss:Type="String">  HR Workspace Export | Date: ${dateStr} | Total Staff: ${employees.length}</Data>
    </Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Full Name</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Official Designation</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Department</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Phone Number</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Work Email</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Date of Joining</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Tenure (Approx)</Data></Cell>
   </Row>`;

  employees.forEach((emp) => {
    const joinYear = new Date(emp.dateOfJoining).getFullYear();
    const tenureYears = new Date().getFullYear() - joinYear;
    const tenureStr = tenureYears <= 0 ? "< 1 Year" : `${tenureYears}+ Year${tenureYears > 1 ? "s" : ""}`;

    xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${emp.empId}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.name}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.designation}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.department}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${emp.phone}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.email || "—"}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${emp.dateOfJoining}</Data></Cell>
    <Cell ss:StyleID="${emp.status === "active" ? "StatusActive" : "StatusInactive"}"><Data ss:Type="String">${emp.status.toUpperCase()}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${tenureStr}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>

 <!-- SHEET 2: DEPARTMENT BREAKDOWN -->
 <Worksheet ss:Name="Department Distribution">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="220"/>
   <Column ss:Width="120"/>
   <Column ss:Width="140"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="2" ss:StyleID="BrandTitle">
     <Data ss:Type="String">  DEPARTMENT HEADCOUNT BREAKDOWN</Data>
    </Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Department Name</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">Total Headcount</Data></Cell>
    <Cell ss:StyleID="HeaderRow"><Data ss:Type="String">% of Total Staff</Data></Cell>
   </Row>`;

  Object.entries(deptCounts).forEach(([dept, count]) => {
    const pct = ((count / employees.length) * 100).toFixed(1);
    xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${dept}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="Number">${count}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${pct}%</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  return { xml, fileName };
}

// =========================================================================
// 2. MICROSOFT WORD (.DOC) DOCUMENT GENERATORS
// =========================================================================

function generateWordWrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #162E3D;
      line-height: 1.6;
      font-size: 11pt;
      background-color: #ffffff;
      padding: 20px;
    }
    h1, h2, h3 {
      font-family: 'Georgia', serif;
      color: #162E3D;
      margin-bottom: 8px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2pt solid #45C512;
      padding-bottom: 12px;
      margin-bottom: 25px;
    }
    .brand-name {
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 2px;
      color: #162E3D;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 9pt;
      color: #706161;
      font-style: italic;
    }
    .badge {
      display: inline-block;
      background-color: #45C512;
      color: #162E3D;
      padding: 4px 10px;
      font-size: 9pt;
      font-weight: bold;
      border-radius: 4px;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #162E3D;
      border-bottom: 1pt solid #DDEAE2;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      margin-bottom: 20px;
    }
    table.data-table th {
      background-color: #162E3D;
      color: #ffffff;
      padding: 8px 12px;
      font-size: 10pt;
      text-align: left;
    }
    table.data-table td {
      border: 1pt solid #DDEAE2;
      padding: 8px 12px;
      font-size: 10pt;
    }
    .signature-box {
      margin-top: 50px;
      width: 100%;
    }
    .signature-line {
      border-top: 1pt solid #162E3D;
      width: 200px;
      margin-top: 40px;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-name">B &amp; Y TECHNOLOGIES</div>
        <div class="brand-sub">Digital Marketing Agency &bull; Chennai &bull; India</div>
      </td>
      <td style="text-align: right;">
        <span class="badge">OFFICIAL HR DOCUMENT</span>
      </td>
    </tr>
  </table>

  ${bodyHtml}

  <div style="margin-top: 40px; font-size: 8pt; color: #706161; text-align: center; border-top: 1pt solid #DDEAE2; padding-top: 10px;">
    B &amp; Y Technologies &bull; Confidential &bull; For Internal &amp; Employee Use Only
  </div>
</body>
</html>`;
}


function getLogoBadgeBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-badge.png");
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath).toString("base64");
    }
  } catch (e) {}
  return "";
}

// =========================================================================
// OFFICIAL 3-PAGE B&Y TECHNOLOGIES LETTER OF OFFER
// =========================================================================

export function generateOfferLetterHtml(
  dataInput: Partial<OfferLetterData> & { emp?: Employee },
  isWord: boolean = false
): string {
  const emp = dataInput.emp;
  const candidateName = (dataInput.candidateName || emp?.name || "Krish Babu").trim();
  const empId = (dataInput.empId || emp?.empId || "BYT-101").trim();
  const designation = (dataInput.designation || emp?.designation || "FullStack Developer").trim();

  const defaultSal = getDefaultSalaryForDesignation(designation);
  const annualSalary = dataInput.annualSalary && dataInput.annualSalary > 0 ? dataInput.annualSalary : defaultSal.annual;
  const monthlySalary = dataInput.monthlySalary && dataInput.monthlySalary > 0 ? dataInput.monthlySalary : Math.round(annualSalary / 12);
  const annualSalaryWords = dataInput.annualSalaryWords || numberToIndianWords(annualSalary);
  const formattedAnnualSalary = formatIndianCurrency(annualSalary);
  const formattedMonthlySalary = formatIndianCurrency(monthlySalary);

  const dob = dataInput.dob ? formatSlashDate(dataInput.dob) : "15/06/1998";
  const addressLine1 = dataInput.addressLine1 || "No: 12, Anna Nagar 2nd Avenue,";
  const addressLine2 = dataInput.addressLine2 || "Shenoy Nagar,";
  const cityStatePin = dataInput.cityStatePin || "Chennai, Tamil Nadu - 600030";

  const dateOfJoining = dataInput.dateOfJoining || emp?.dateOfJoining || new Date().toISOString().split("T")[0];
  const formattedDoj = formatSlashDate(dateOfJoining);
  const offerDate = dataInput.offerDate || new Date().toISOString().split("T")[0];
  const formattedOfferDate = formatLongDate(offerDate);

  const signatoryName = dataInput.signatoryName || "Babu B";
  const signatoryTitle = dataInput.signatoryTitle || "Branch Manager";
  const workTimings = dataInput.workTimings || "Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm.";

  // Extract first name for salutation
  const firstName = candidateName.split(" ")[0] || "Candidate";
  const salutationPrefix = dataInput.salutationPrefix || "Mr./Ms.";

  const logoBase64 = getLogoBadgeBase64();
  const logoImgSrc = logoBase64 ? `data:image/png;base64,${logoBase64}` : "/logo-badge.png";

  const cornerRibbonSvg = `
    <svg width="130" height="70" viewBox="0 0 130 70" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <polygon points="35,0 130,0 130,70 65,70" fill="#19385C" />
      <polygon points="0,0 55,0 108,70 52,70" fill="#45C512" />
    </svg>
  `;

  // Reusable Page Header matching Canva sample
  const renderHeader = () => `
    <div style="position: relative; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 1.5pt solid #DDEAE2;">
      <div style="position: absolute; top: -14mm; right: -16mm; width: 130px; height: 70px; overflow: hidden; pointer-events: none; z-index: 2;">
        ${cornerRibbonSvg}
      </div>
      <table style="width: 100%; border-collapse: collapse; position: relative; z-index: 1;">
        <tr>
          <td style="width: 65px; vertical-align: middle;">
            <div style="position: relative; width: 58px; height: 58px; display: inline-block;">
              <img src="${logoImgSrc}" alt="B&amp;Y Logo" style="width: 58px; height: 58px; border-radius: 50%; display: block;" />
              <span style="position: absolute; top: -2px; right: -6px; font-size: 9pt; font-weight: bold; color: #19385C; font-family: serif;">&reg;</span>
            </div>
          </td>
          <td style="vertical-align: middle; padding-left: 12px;">
            <div style="font-family: 'Georgia', serif; font-size: 20pt; font-weight: bold; color: #19385C; letter-spacing: 0.5px; line-height: 1.1;">
              B&amp;Y Technologies
            </div>
            <div style="font-family: 'Georgia', serif; font-size: 9pt; font-style: italic; color: #606060; margin-top: 3px;">
              Together, we&#39;ll grow your business
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  // Reusable Watermark
  const watermarkHtml = `
    <div style="position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%) rotate(-32deg); font-family: 'Georgia', serif; font-size: 110pt; font-weight: bold; color: #19385C; opacity: 0.038; letter-spacing: 14px; pointer-events: none; z-index: 0; user-select: none;">
      B&amp;Y
    </div>
  `;

  // Reusable Page Footer matching Canva sample
  const renderFooter = () => `
    <div style="margin-top: auto; padding-top: 10px; position: relative; z-index: 1;">
      <div style="font-size: 8pt; color: #555555; text-align: center; font-family: 'Calibri', Arial, sans-serif; line-height: 1.4;">
        <span style="margin: 0 8px;">🌐 www.bnytechnologies.com</span> &bull;
        <span style="margin: 0 8px;">📞 9941070555</span> &bull;
        <span style="margin: 0 8px;">✉️ hr@bnytechnologies.in</span> &bull;
        <span style="margin: 0 8px;">📍 No : 624 Khivraj Building 4th floor, Anna Salai Chennai-600006</span>
      </div>
      <div style="width: 100%; height: 5px; background: linear-gradient(90deg, #19385C 0%, #19385C 62%, #45C512 62%, #45C512 100%); margin-top: 8px; border-radius: 2px;"></div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Letter Of Offer - ${escapeHtml(candidateName)} - B&amp;Y Technologies</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
      mso-header-margin: 0.3in;
      mso-footer-margin: 0.3in;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      background-color: ${isWord ? "#ffffff" : "#f4f6f8"};
      font-size: 9.8pt;
      line-height: 1.5;
    }
    .page-container {
      width: 210mm;
      min-height: 297mm;
      margin: ${isWord ? "0" : "20px auto"};
      background: #ffffff;
      padding: 14mm 16mm 14mm 16mm;
      position: relative;
      box-shadow: ${isWord ? "none" : "0 4px 24px rgba(0,0,0,0.12)"};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .page-container {
        margin: 0;
        padding: 12mm 15mm;
        width: 100%;
        min-height: 297mm;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }
      .no-print {
        display: none !important;
      }
    }
    .terms-ol {
      margin: 0;
      padding-left: 20px;
      font-size: 9.1pt;
      line-height: 1.52;
      color: #1f1f1f;
    }
    .terms-ol li {
      margin-bottom: 7px;
      text-align: justify;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: LETTER OF OFFER ==================== -->
  <div class="page-container">
    ${watermarkHtml}
    ${renderHeader()}

    <div style="position: relative; z-index: 1; flex: 1;">
      <div style="text-align: center; font-family: 'Georgia', serif; font-size: 19pt; font-weight: bold; color: #1E518A; letter-spacing: 0.5px; margin-top: 6px; margin-bottom: 8px;">
        Letter Of Offer
      </div>

      <div style="text-align: right; font-size: 9.5pt; color: #222222; margin-bottom: 14px; font-weight: 500;">
        ${formattedOfferDate}
      </div>

      <div style="margin-bottom: 16px; font-size: 9.5pt; line-height: 1.45; color: #222222;">
        <div style="font-weight: 600; color: #333333; margin-bottom: 2px;">To,</div>
        <div style="font-size: 11pt; font-weight: bold; color: #111111; text-transform: uppercase; letter-spacing: 0.5px;">
          ${escapeHtml(candidateName.toUpperCase())}
        </div>
        <div style="margin: 3px 0; color: #2b2b2b;">
          <span><strong>DOB :</strong> ${dob}</span>
          <span style="margin-left: 20px;"><strong>Emp ID :</strong> ${empId}</span>
        </div>
        <div>${escapeHtml(addressLine1)}</div>
        <div>${escapeHtml(addressLine2)}</div>
        <div>${escapeHtml(cityStatePin)}</div>
      </div>

      <div style="font-size: 10pt; font-weight: bold; color: #19385C; margin-bottom: 12px;">
        Dear ${salutationPrefix} ${escapeHtml(firstName)},
      </div>

      <p style="font-size: 9.5pt; line-height: 1.6; color: #262626; text-align: justify; margin-bottom: 16px;">
        Thank you for exploring career opportunities with B &amp; Y Technologies. We are pleased to make you an offer as 
        <strong>${escapeHtml(designation)}</strong> in B &amp; Y Technologies registered office 
        <strong>624, Anna salai, 4th floor khivraj Building near gemini flyover chennai - 600 006</strong>. 
        The key components of this offer.
      </p>

      <div style="margin: 14px 0 20px 0;">
        <div style="margin-bottom: 12px; font-size: 9.5pt; line-height: 1.55;">
          <strong style="color: #19385C;">Title :</strong> 
          <span style="margin-left: 6px; font-weight: 600;">${escapeHtml(designation)}</span>
        </div>

        <div style="margin-bottom: 14px; font-size: 9.5pt; line-height: 1.55; text-align: justify;">
          <strong style="color: #19385C;">Compensation :</strong> 
          <span>Your Total Gross pay will be <strong>INR ${formattedAnnualSalary} (${annualSalaryWords})</strong> per annum. In addition you will be eligible for performance based incentives as advised from time to time.</span>
        </div>

        <div style="margin-bottom: 12px; font-size: 9.2pt; line-height: 1.55; color: #2c2c2c; text-align: justify;">
          In the event you desire to leave the services of the company you are required to give one month&#39;s advance notice in writing. Failure to do so will result in forfeiture of 1 month&#39;s salary and incentives if any, due to you.
        </div>

        <div style="margin-bottom: 14px; font-size: 9.2pt; line-height: 1.55; color: #2c2c2c; text-align: justify;">
          In the event that you are absent without permission for more than 3 days it will be deemed as your having absconded and having left the service of the company without providing notice.
        </div>
      </div>

      <!-- PAGE 1 DUAL SIGNATURES -->
      <div style="margin-top: 25px; padding-top: 10px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <div style="font-weight: bold; color: #19385C;">FOR B&amp;Y TECHNOLOGIES,</div>
              <div style="margin-top: 30px; font-weight: bold; color: #111111; font-size: 10.5pt;">${escapeHtml(signatoryName)}</div>
              <div style="color: #444444; font-size: 9.5pt;">${escapeHtml(signatoryTitle)}</div>
              <div style="color: #666666; font-size: 9pt; margin-top: 4px;">${formattedOfferDate}</div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 15px;">
              <div style="color: #333333; margin-bottom: 10px;">Accept the above stated terms of employment,</div>
              <div style="margin-bottom: 6px;"><strong>Name :</strong> ${escapeHtml(candidateName)}</div>
              <div style="margin-bottom: 6px;"><strong>Signature :</strong> _____________________________</div>
              <div><strong>D.O.J :</strong> ${formattedDoj}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    ${renderFooter()}
  </div>

  <br clear="all" style="mso-special-character:line-break;page-break-before:always" />

  <!-- ==================== PAGE 2: ANNEXURE (GENERAL TERMS) ==================== -->
  <div class="page-container">
    ${watermarkHtml}
    ${renderHeader()}

    <div style="position: relative; z-index: 1; flex: 1;">
      <div style="font-family: 'Georgia', serif; font-size: 16pt; font-weight: bold; color: #1E518A; margin-bottom: 2px;">
        Annexure
      </div>
      <div style="font-family: 'Georgia', serif; font-size: 11pt; font-weight: bold; color: #19385C; margin-bottom: 12px;">
        General Terms:
      </div>

      <ol class="terms-ol">
        <li>You will be entitled to a Salary of <strong>₹${formattedMonthlySalary}/- per month</strong>.</li>
        <li>Your performance will be reviewed in 12 months and your Salary will be subsequently revised based on satisfactory performance.</li>
        <li>Work timings are as <strong>${escapeHtml(workTimings)}</strong>.</li>
        <li>Monthly payments would be paid after deductions of any loans or advances received from the firm.</li>
        <li>Your reporting and responsibilities will be advised to you by your superior or any person nominated by him/her.</li>
        <li>You shall, while in the services of the firm, devote your time and attention to the Firm&#39;s work and responsibilities assigned to you.</li>
        <li>It is expected that you will discharge your assigned responsibilities with high standards of performance, quality, integrity, and discipline.</li>
        <li>In this role, the company will provide hardware equipment / design software. When necessary, you will be given access to licensed / web-based software. You are required to use the access only for Company purposes.</li>
        <li>You shall, while in the services of the firm, be responsible for delivering the projects assigned to you on time. You will be expected to work with the team toward the Firm&#39;s goals.</li>
        <li>You shall be obliged to follow the work processes, technical standards, protocols and general instructions issued thereto, and service rules of the Firm as in force and/or amended from time to time.</li>
        <li>The Company expects all employees to cooperate in day-to-day operations, and it is an essential feature of this job that you will be expected to work additional hours from time to time to meet business / operational needs. The additional hours may involve working weekends or Public Holidays.</li>
        <li>Poaching of B&amp;Y Technologies clients or its Partners will not be tolerated while in service of B&amp;Y Technologies and within 2 years of exiting B&amp;Y Technologies as an employee.</li>
        <li>Any intellectual property created by the employee during the course of employment will be the property of the company. The employee agrees to assign any right, title, and interest in such work to the company.</li>
        <li>Freelancing or engaging in any independent work with any of the Company&#39;s clients or via their connections will not be tolerated while in service of the Company and within two years of exiting the Company as an employee.</li>
        <li>Upon termination of employment, you will also return all firm property, which may be in your possession including intellectual property and artworks.</li>
        <li>It would be obligatory on your part to get a proper relieving letter from the Management before your services are deemed to be concluded. On mutual agreement between the firm and the employee, there will be a one-month notice.</li>
      </ol>
    </div>

    ${renderFooter()}
  </div>

  <br clear="all" style="mso-special-character:line-break;page-break-before:always" />

  <!-- ==================== PAGE 3: CODE OF CONDUCT & ACCEPTANCE ==================== -->
  <div class="page-container">
    ${watermarkHtml}
    ${renderHeader()}

    <div style="position: relative; z-index: 1; flex: 1;">
      <div style="font-family: 'Georgia', serif; font-size: 16pt; font-weight: bold; color: #1E518A; margin-bottom: 10px;">
        Code of Conduct:
      </div>

      <ol class="terms-ol">
        <li>In all other matters on disciplinary grounds or any other matter, you will be governed by the rules as in force or which may be enforced from time to time.</li>
        <li>Your remuneration is purely a matter between yourself and the firm and has been arrived at based on your job, skills, specific background and professional merit. Accordingly, your salary and any changes made to it are strictly confidential; you shall treat such matters accordingly, and any breach thereof would be viewed very seriously.</li>
        <li>You shall maintain proper discipline and dignity of your office and so shall deal with all matters.</li>
        <li>You shall maintain and keep in your safe custody all intellectual property of our clients and keep a backup of all your work for B&amp;Y Technologies and its clients.</li>
        <li>All intellectual property and artworks that you create for B&amp;Y Technologies and its clients will belong to B&amp;Y Technologies and should not be published elsewhere.</li>
        <li>You shall inform the Firm of any changes in your personal data within 3 days of the occurrence of such change.</li>
        <li>You shall inform the Firm / Management of any cash payments received on the spot as a first priority, failing which you will be held liable.</li>
        <li>You shall be solely responsible for any issues that may arise between you and your previous employer or any other personal dealings will remain personal and the Firm or any of its personnel are not responsible for the same.</li>
        <li>Salary comparison between colleagues will not be entertained and is prohibited.</li>
        <li>Financial details of the Firm and projects the firm is working on should not be shared or discussed with outsiders of the firm.</li>
        <li>The Firm has the right to terminate employment within any time from the date of joining without any notice period. This only happens if the Firm does not find your work or conduct suitable or in the firm&#39;s best interest.</li>
        <li>After 3 months, if the Firm does not find your work or conduct suitable or in the best interest of the Firm, the termination notice period will be 2 weeks. At which point you are to return all intellectual property to the Firm.</li>
        <li>In cases of Gross Misconduct, the Company has the right to terminate your employment and no notice pay will be due, any days worked up to your termination will be paid. No salary will be paid post this date.</li>
        <li>Any notice required to be given to you shall be deemed to have been duly and properly given if delivered to you personally or sent by post to you at your address, as recorded in the Firm.</li>
        <li><strong>As per company policy, 7 days&#39; salary will be kept on hold as a security / settlement period during the employee&#39;s separation process. The held salary will be released and credited to the employee after proper relieving from the firm, including completion of the required notice period, handover of responsibilities, return of company assets, and completion of all exit formalities. The payment will be processed along with the applicable salary / settlement cycle after successful completion of the relieving formalities.</strong></li>
      </ol>

      <div style="font-size: 9.2pt; color: #222222; margin: 12px 0 14px 0; font-weight: 500;">
        In response to this communication of appointment, you are required to confirm your acceptance by signing this letter below.
      </div>

      <!-- PAGE 3 DUAL SIGNATURES -->
      <div style="margin-top: 14px; padding-top: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <div style="font-weight: bold; color: #19385C;">FOR B&amp;Y TECHNOLOGIES,</div>
              <div style="margin-top: 30px; font-weight: bold; color: #111111; font-size: 10.5pt;">${escapeHtml(signatoryName)}</div>
              <div style="color: #444444; font-size: 9.5pt;">${escapeHtml(signatoryTitle)}</div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 15px;">
              <div style="color: #333333; margin-bottom: 10px;">Accept the above stated terms of employment,</div>
              <div style="margin-bottom: 6px;"><strong>Name :</strong> ${escapeHtml(candidateName)}</div>
              <div style="margin-bottom: 6px;"><strong>Signature :</strong> _____________________________</div>
              <div><strong>D.O.J :</strong> ${formattedDoj}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    ${renderFooter()}
  </div>

</body>
</html>`;
}

// Generate Official 3-Page Letter Of Offer in Word (.doc)
export function generateOfferLetterWord(
  dataInput: Partial<OfferLetterData> & { emp?: Employee }
): { doc: string; fileName: string } {
  const emp = dataInput.emp;
  const candidateName = (dataInput.candidateName || emp?.name || "Candidate").trim();
  const empId = (dataInput.empId || emp?.empId || "BYT-101").trim();
  const fileName = `Letter_Of_Offer_${empId}_${candidateName.replace(/\s+/g, "_")}.doc`;
  const doc = generateOfferLetterHtml(dataInput, true);
  return { doc, fileName };
}

// Backwards-compatible alias for Appointment Letter
export function generateAppointmentLetterWord(emp: Employee): { doc: string; fileName: string } {
  return generateOfferLetterWord({ emp });
}

// Generate Complete Employee Dossier in Word (.doc)
export function generateEmployeeDossierWord(emp: Employee): { doc: string; fileName: string } {
  const fileName = `Employee_Dossier_${emp.empId}_${emp.name.replace(/\s+/g, "_")}.doc`;
  const attendance = getAttendance().filter((a) => a.employeeId === emp.id);
  const leaves = getLeaves().filter((l) => l.employeeId === emp.id);

  let present = 0, late = 0, half = 0, absent = 0;
  attendance.forEach((a) => {
    if (a.status === "Present") present++;
    else if (a.status === "Late") late++;
    else if (a.status === "Half day") half++;
    else if (a.status === "Absent") absent++;
  });

  const bodyHtml = `
    <h2 style="text-align: center; margin-bottom: 5px;">EMPLOYEE DOSSIER &amp; SERVICE RECORD</h2>
    <div style="text-align: center; font-size: 10pt; color: #706161; margin-bottom: 25px;">
      B &amp; Y Technologies Human Resources Vault
    </div>

    <div class="section-title">1. Personal &amp; Employment Profile</div>
    <table class="data-table">
      <tr>
        <th style="width: 25%;">Employee ID</th>
        <td style="width: 25%;"><strong>${emp.empId}</strong></td>
        <th style="width: 25%;">Employment Status</th>
        <td style="width: 25%;"><strong>${emp.status.toUpperCase()}</strong></td>
      </tr>
      <tr>
        <th>Full Name</th>
        <td>${emp.name}</td>
        <th>Official Designation</th>
        <td><strong>${emp.designation}</strong></td>
      </tr>
      <tr>
        <th>Department</th>
        <td>${emp.department}</td>
        <th>Date of Joining</th>
        <td>${emp.dateOfJoining}</td>
      </tr>
      <tr>
        <th>Contact Number</th>
        <td>${emp.phone}</td>
        <th>Work Email</th>
        <td>${emp.email || "— (No email required)"}</td>
      </tr>
    </table>

    <div class="section-title">2. Lifetime Attendance Overview</div>
    <table class="data-table">
      <tr>
        <th>Total Logged Days</th>
        <th>Present Days</th>
        <th>Late Days</th>
        <th>Half Days</th>
        <th>Absent Days</th>
        <th>Approved Leaves</th>
      </tr>
      <tr style="text-align: center;">
        <td><strong>${attendance.length}</strong></td>
        <td style="color: #166534; font-weight: bold;">${present}</td>
        <td style="color: #854D0E;">${late}</td>
        <td style="color: #1E40AF;">${half}</td>
        <td style="color: #991B1B;">${absent}</td>
        <td style="color: #5B21B6; font-weight: bold;">${leaves.filter((l) => l.status === "Approved").length}</td>
      </tr>
    </table>

    <div class="section-title">3. Leave Application History</div>
    ${
      leaves.length === 0
        ? `<p style="font-size: 10pt; color: #706161;">No leave applications recorded for this staff member.</p>`
        : `<table class="data-table">
            <tr>
              <th>Type</th>
              <th>Period</th>
              <th>Days</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
            ${leaves
              .map(
                (l) => `<tr>
              <td>${l.leaveType}</td>
              <td>${l.fromDate} to ${l.toDate}</td>
              <td>${l.days}</td>
              <td><strong>${l.status}</strong></td>
              <td>${l.reason}</td>
            </tr>`
              )
              .join("")}
          </table>`
    }

    <div class="section-title">4. HR Verification &amp; Certification</div>
    <p style="font-size: 10pt;">
      This dossier is an authentic service record extracted from B &amp; Y Technologies HR management system. 
      All records therein are verified and maintained in accordance with company governance guidelines.
    </p>

    <div class="signature-line" style="margin-top: 40px;">
      <strong>Certified By: HR Department</strong><br>
      B &amp; Y Technologies
    </div>
  `;

  return { doc: generateWordWrapper(`Employee Dossier - ${emp.name}`, bodyHtml), fileName };
}

// Generate NDA Agreement in Word (.doc)
export function generateNdaAgreementWord(emp: Employee): { doc: string; fileName: string } {
  const fileName = `NDA_Agreement_${emp.empId}_${emp.name.replace(/\s+/g, "_")}.doc`;
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long" });

  const bodyHtml = `
    <h2 style="text-align: center; margin-bottom: 5px;">NON-DISCLOSURE &amp; CONFIDENTIALITY AGREEMENT</h2>
    <div style="text-align: center; font-size: 10pt; color: #706161; margin-bottom: 25px;">
      Digital Marketing Agency &bull; Client Data &bull; Proprietary Assets
    </div>

    <p>This Non-Disclosure Agreement ("Agreement") is executed on <strong>${today}</strong> by and between:</p>

    <p>
      <strong>B &amp; Y Technologies</strong>, a digital marketing agency having its registered office in Chennai ("Company"),<br>
      AND<br>
      <strong>${emp.name}</strong>, holding Employee ID <strong>${emp.empId}</strong>, currently engaged as <strong>${emp.designation}</strong> ("Employee").
    </p>

    <div class="section-title">1. Confidential Information Defined</div>
    <p>
      Confidential information includes, without limitation: client business data, digital marketing strategy blueprints, 
      Google Ads &amp; Meta Ads account access, conversion rate data, SEO keyword databases, proprietary agency software, 
      telecalling client databases, creative assets, and client compensation arrangements.
    </p>

    <div class="section-title">2. Obligations of Non-Disclosure</div>
    <p>
      The Employee agrees not to disclose, duplicate, transfer, or exploit any Confidential Information for personal benefit 
      or the benefit of any third-party during employment or subsequent to separation from the Company.
    </p>

    <div class="section-title">3. Return of Materials</div>
    <p>
      Upon termination or request, the Employee shall immediately return all documents, client credentials, laptops, digital files, 
      and correspondence belonging to the Company.
    </p>

    <table class="signature-box">
      <tr>
        <td style="width: 50%;">
          <strong>B &amp; Y Technologies</strong>
          <div class="signature-line">
            Authorized Executive Signature
          </div>
        </td>
        <td style="width: 50%; text-align: right;">
          <div style="display: inline-block; text-align: left;">
            <strong>${emp.name}</strong> (${emp.empId})
            <div class="signature-line">
              Employee Signature
            </div>
          </div>
        </td>
      </tr>
    </table>
  `;

  return { doc: generateWordWrapper(`NDA Agreement - ${emp.name}`, bodyHtml), fileName };
}

// =========================================================================
// 3. WORKSPACE STREAMING & DISK PERSISTENCE
// =========================================================================

export async function saveWorkspaceDocumentStream(
  docType: "master_roster" | "appointment_letter" | "offer_letter" | "employee_dossier" | "nda_agreement",
  empId?: string,
  customOfferData?: Partial<OfferLetterData>
): Promise<WorkspaceFileMetadata> {
  ensureWorkspaceDirs();

  let content: string;
  let fileName: string;
  let category: "excel" | "word";
  let targetDir: string;
  let empName: string | undefined;
  let employeeId: string | undefined;

  if (docType === "master_roster") {
    category = "excel";
    targetDir = path.join(WORKSPACE_BASE_DIR, "excel");
    const res = generateEmployeeMasterExcel();
    content = res.xml;
    fileName = res.fileName;
  } else {
    category = "word";
    targetDir = path.join(WORKSPACE_BASE_DIR, "word");
    const employees = getEmployees();
    const emp = employees.find((e) => e.empId === empId || e.id === empId) || employees[0];
    empName = customOfferData?.candidateName || emp?.name;
    employeeId = customOfferData?.empId || emp?.empId;

    if (docType === "offer_letter" || docType === "appointment_letter") {
      const res = generateOfferLetterWord({ emp, ...customOfferData });
      content = res.doc;
      fileName = res.fileName;
    } else if (docType === "employee_dossier") {
      const res = generateEmployeeDossierWord(emp);
      content = res.doc;
      fileName = res.fileName;
    } else {
      const res = generateNdaAgreementWord(emp);
      content = res.doc;
      fileName = res.fileName;
    }
  }

  const filePath = path.join(targetDir, fileName);

  // Write via stream pipeline
  const sourceStream = Readable.from(Buffer.from(content, "utf-8"));
  const destinationStream = fs.createWriteStream(filePath);
  await pipeline(sourceStream, destinationStream);

  const stats = fs.statSync(filePath);
  const relativePath = path.relative(WORKSPACE_BASE_DIR, filePath).replace(/\\/g, "/");

  return {
    fileName,
    category,
    docType,
    employeeName: empName,
    empId: employeeId,
    sizeBytes: stats.size,
    sizeFormatted: formatBytes(stats.size),
    createdAt: stats.mtime.toISOString(),
    relativePath,
    downloadUrl: `/api/workspace/download?file=${encodeURIComponent(relativePath)}`,
  };
}

// List all files in the workspace directory
export function getWorkspaceFiles(): WorkspaceFileMetadata[] {
  ensureWorkspaceDirs();
  const results: WorkspaceFileMetadata[] = [];

  function scan(dir: string, category: "excel" | "word") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(dir, entry.name);
        const stats = fs.statSync(fullPath);
        const relativePath = path.relative(WORKSPACE_BASE_DIR, fullPath).replace(/\\/g, "/");

        let docType: WorkspaceFileMetadata["docType"] = "master_roster";
        if (entry.name.includes("Offer") || entry.name.includes("Appointment")) docType = "offer_letter";
        else if (entry.name.includes("Dossier")) docType = "employee_dossier";
        else if (entry.name.includes("NDA")) docType = "nda_agreement";

        // Extract employee ID if present (e.g. BYT-101)
        const match = entry.name.match(/BYT-\d+/);
        const empId = match ? match[0] : undefined;

        results.push({
          fileName: entry.name,
          category,
          docType,
          empId,
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
          relativePath,
          downloadUrl: `/api/workspace/download?file=${encodeURIComponent(relativePath)}`,
        });
      }
    }
  }

  scan(path.join(WORKSPACE_BASE_DIR, "excel"), "excel");
  scan(path.join(WORKSPACE_BASE_DIR, "word"), "word");

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Delete file from workspace
export function deleteWorkspaceFile(relativePath: string): boolean {
  try {
    const resolvedPath = path.resolve(WORKSPACE_BASE_DIR, relativePath);
    if (!resolvedPath.startsWith(path.resolve(WORKSPACE_BASE_DIR))) {
      throw new Error("Access denied");
    }
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Delete workspace file error:", err);
    return false;
  }
}
