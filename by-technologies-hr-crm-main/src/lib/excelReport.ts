import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getEmployees, getAttendance, getLeaves } from "./db";
import { getAttendanceTeam } from "./types";

export const REPORTS_BASE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "reports", "attendance")
  : path.join(process.cwd(), "reports", "attendance");

export interface SavedReportMetadata {
  fileName: string;
  folderPath: string;
  relativePath: string;
  month: string;
  format: "excel" | "csv";
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  downloadUrl: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to calculate statistics for a given month
export function getMonthlyAttendanceData(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const employees = getEmployees();
  const allAttendance = getAttendance();
  const allLeaves = getLeaves();

  // Filter attendance for the requested month
  const monthlyAttendance = allAttendance.filter((a) => a.date.startsWith(month));

  // Filter leaves overlapping the month
  const monthlyLeaves = allLeaves.filter((l) => {
    if (l.status !== "Approved") return false;
    const startMonth = l.fromDate.substring(0, 7);
    const endMonth = l.toDate.substring(0, 7);
    return startMonth <= month && endMonth >= month;
  });

  // Calculate statistics per employee
  const employeeStats = employees.map((emp) => {
    const records = monthlyAttendance.filter((a) => a.employeeId === emp.id);
    let present = 0;
    let late = 0;
    let halfDay = 0;
    let absent = 0;

    records.forEach((r) => {
      if (r.status === "Present") present++;
      else if (r.status === "Late") late++;
      else if (r.status === "Half day") halfDay++;
      else if (r.status === "Absent") absent++;
    });

    const empLeaves = monthlyLeaves.filter((l) => l.employeeId === emp.id);
    let leaveDays = 0;
    empLeaves.forEach((l) => {
      leaveDays += l.days;
    });

    const totalRecorded = records.length;
    const effectiveDays = present + late + halfDay * 0.5;
    const attendanceRate =
      totalRecorded > 0 ? ((effectiveDays / totalRecorded) * 100).toFixed(1) : "0.0";

    return {
      emp,
      records,
      present,
      late,
      halfDay,
      absent,
      leaveDays,
      totalRecorded,
      attendanceRate: `${attendanceRate}%`,
    };
  });

  return {
    year,
    monthIndex,
    daysInMonth,
    monthName,
    employees,
    monthlyAttendance,
    monthlyLeaves,
    employeeStats,
  };
}

// Generate Native XML Spreadsheet 2003 (.xls) Content
export function generateExcelXml(month: string): { xml: string; fileName: string; monthName: string } {
  const { daysInMonth, monthName, employees, monthlyAttendance, monthlyLeaves, employeeStats } =
    getMonthlyAttendanceData(month);

  const fileName = `BY_Technologies_Attendance_${month}.xls`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>B &amp; Y Technologies HR</Author>
  <Company>B &amp; Y Technologies</Company>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="BrandTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Georgia" ss:Size="18" ss:Bold="1" ss:Color="#162E3D"/>
   <Interior ss:Color="#45C512" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#5B7586"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Georgia" ss:Size="13" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#162E3D" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#162E3D"/>
   <Interior ss:Color="#EEF9EB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="CellBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#162E3D"/>
  </Style>
  <Style ss:ID="RateGood">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusPresent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#166534"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#854D0E"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusHalf">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#1E40AF"/>
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusAbsent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusLeave">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#5B21B6"/>
   <Interior ss:Color="#EDE9FE" ss:Pattern="Solid"/>
  </Style>
 </Styles>`;

  // -------------------------------------------------------------------------
  // WORKSHEET 1: MONTHLY SUMMARY
  // -------------------------------------------------------------------------
  xml += `
 <Worksheet ss:Name="Monthly Summary">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="90"/>
   <Column ss:Width="160"/>
   <Column ss:Width="130"/>
   <Column ss:Width="170"/>
   <Column ss:Width="180"/>
   <Column ss:Width="75"/>
   <Column ss:Width="80"/>
   <Column ss:Width="75"/>
   <Column ss:Width="75"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>

   <Row ss:Height="36">
    <Cell ss:MergeAcross="12" ss:StyleID="BrandTitle">
     <Data ss:Type="String">  B &amp; Y TECHNOLOGIES — MONTHLY ATTENDANCE REPORT</Data>
    </Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="12" ss:StyleID="SubTitle">
     <Data ss:Type="String">  Reporting Period: ${monthName} | Generated: ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })} ${new Date().toLocaleTimeString("en-US", { timeStyle: "short" })}</Data>
    </Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Full Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Attendance Team</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Department</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Designation</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Present Days</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Late Days</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Half Days</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Absent Days</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Approved Leaves</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Logged Days</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Attendance Rate</Data></Cell>
   </Row>`;

  employeeStats.forEach(
    ({ emp, present, late, halfDay, absent, leaveDays, totalRecorded, attendanceRate }) => {
      xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${emp.empId}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.name}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${getAttendanceTeam(emp)}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.department}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.designation}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${emp.status.toUpperCase()}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${present}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${late}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${halfDay}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${absent}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${leaveDays}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalRecorded}</Data></Cell>
    <Cell ss:StyleID="RateGood"><Data ss:Type="String">${attendanceRate}</Data></Cell>
   </Row>`;
    }
  );

  xml += `
  </Table>
 </Worksheet>`;

  // -------------------------------------------------------------------------
  // WORKSHEET 2: DAILY ATTENDANCE MATRIX
  // -------------------------------------------------------------------------
  xml += `
 <Worksheet ss:Name="Daily Attendance Matrix">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="85"/>
   <Column ss:Width="145"/>
   <Column ss:Width="110"/>`;

  for (let d = 1; d <= daysInMonth; d++) {
    xml += `<Column ss:Width="42"/>`;
  }

  xml += `
   <Row ss:Height="30">
    <Cell ss:MergeAcross="${daysInMonth + 2}" ss:StyleID="SectionHeader">
     <Data ss:Type="String">  DAILY ATTENDANCE MATRIX — ${monthName.toUpperCase()}</Data>
    </Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Emp ID</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Team</Data></Cell>`;

  for (let d = 1; d <= daysInMonth; d++) {
    xml += `<Cell ss:StyleID="ColHeader"><Data ss:Type="String">D${d}</Data></Cell>`;
  }
  xml += `</Row>`;

  employees.forEach((emp) => {
    xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${emp.empId}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp.name}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${getAttendanceTeam(emp)}</Data></Cell>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${month}-${String(d).padStart(2, "0")}`;
      const rec = monthlyAttendance.find((a) => a.employeeId === emp.id && a.date === dayStr);
      const isLeave = monthlyLeaves.some(
        (l) => l.employeeId === emp.id && dayStr >= l.fromDate && dayStr <= l.toDate
      );

      if (isLeave) {
        xml += `<Cell ss:StyleID="StatusLeave"><Data ss:Type="String">LV</Data></Cell>`;
      } else if (rec?.status === "Present") {
        xml += `<Cell ss:StyleID="StatusPresent"><Data ss:Type="String">P</Data></Cell>`;
      } else if (rec?.status === "Late") {
        xml += `<Cell ss:StyleID="StatusLate"><Data ss:Type="String">L</Data></Cell>`;
      } else if (rec?.status === "Half day") {
        xml += `<Cell ss:StyleID="StatusHalf"><Data ss:Type="String">HD</Data></Cell>`;
      } else if (rec?.status === "Absent") {
        xml += `<Cell ss:StyleID="StatusAbsent"><Data ss:Type="String">A</Data></Cell>`;
      } else {
        xml += `<Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>`;
      }
    }
    xml += `</Row>`;
  });

  xml += `
  </Table>
 </Worksheet>`;

  // -------------------------------------------------------------------------
  // WORKSHEET 3: DETAILED ATTENDANCE LOGS
  // -------------------------------------------------------------------------
  xml += `
 <Worksheet ss:Name="Detailed Attendance Logs">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="95"/>
   <Column ss:Width="85"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="160"/>
   <Column ss:Width="85"/>
   <Column ss:Width="105"/>
   <Column ss:Width="105"/>
   <Column ss:Width="250"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="8" ss:StyleID="SectionHeader">
     <Data ss:Type="String">  DETAILED CHECK-IN &amp; SHIFT LOGS — ${monthName.toUpperCase()}</Data>
    </Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Emp ID</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Team</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Department</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Check-In</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Check-Out</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Notes / Location</Data></Cell>
   </Row>`;

  monthlyAttendance
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((att) => {
      const emp = employees.find((e) => e.id === att.employeeId);
      let statusStyle = "CellCenter";
      if (att.status === "Present") statusStyle = "StatusPresent";
      else if (att.status === "Late") statusStyle = "StatusLate";
      else if (att.status === "Half day") statusStyle = "StatusHalf";
      else if (att.status === "Absent") statusStyle = "StatusAbsent";

      xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${att.date}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${emp?.empId || "—"}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp?.name || "—"}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp ? getAttendanceTeam(emp) : "—"}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${emp?.department || "—"}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${att.status}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${att.checkInTime || "—"}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${att.checkOutTime || "—"}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${(att.notes || "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>
   </Row>`;
    });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  return { xml, fileName, monthName };
}

// Generate CSV Content with UTF-8 BOM
export function generateCsvContent(month: string): { csv: string; fileName: string; monthName: string } {
  const { daysInMonth, monthName, employees, monthlyAttendance, monthlyLeaves, employeeStats } =
    getMonthlyAttendanceData(month);

  const fileName = `BY_Technologies_Attendance_${month}.csv`;

  let csv = "\uFEFF"; // UTF-8 BOM for Excel
  csv += `"B & Y TECHNOLOGIES - MONTHLY ATTENDANCE REPORT - ${monthName.toUpperCase()}"\r\n`;
  csv += `"Generated on: ${new Date().toLocaleString()}"\r\n\r\n`;

  csv += `"SECTION 1: MONTHLY EMPLOYEE SUMMARY"\r\n`;
  csv += `"Employee ID","Full Name","Attendance Team","Department","Designation","Status","Present Days","Late Days","Half Days","Absent Days","Approved Leaves","Recorded Days","Attendance Rate"\r\n`;

  employeeStats.forEach(
    ({ emp, present, late, halfDay, absent, leaveDays, totalRecorded, attendanceRate }) => {
      csv += `"${emp.empId}","${emp.name}","${getAttendanceTeam(emp)}","${emp.department}","${emp.designation}","${emp.status}","${present}","${late}","${halfDay}","${absent}","${leaveDays}","${totalRecorded}","${attendanceRate}"\r\n`;
    }
  );

  csv += `\r\n"SECTION 2: DAILY ATTENDANCE MATRIX (${monthName})"\r\n`;
  let matrixHeader = `"Employee ID","Name","Attendance Team"`;
  for (let d = 1; d <= daysInMonth; d++) {
    matrixHeader += `,"Day ${d}"`;
  }
  csv += matrixHeader + `\r\n`;

  employees.forEach((emp) => {
    let row = `"${emp.empId}","${emp.name}","${getAttendanceTeam(emp)}"`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${month}-${String(d).padStart(2, "0")}`;
      const rec = monthlyAttendance.find((a) => a.employeeId === emp.id && a.date === dayStr);
      const isLeave = monthlyLeaves.some(
        (l) => l.employeeId === emp.id && dayStr >= l.fromDate && dayStr <= l.toDate
      );

      let code = "-";
      if (isLeave) code = "LEAVE";
      else if (rec?.status === "Present") code = "PRESENT";
      else if (rec?.status === "Late") code = "LATE";
      else if (rec?.status === "Half day") code = "HALF-DAY";
      else if (rec?.status === "Absent") code = "ABSENT";

      row += `,"${code}"`;
    }
    csv += row + `\r\n`;
  });

  csv += `\r\n"SECTION 3: DETAILED TIME LOGS"\r\n`;
  csv += `"Date","Employee ID","Name","Attendance Team","Department","Status","Check-In Time","Check-Out Time","Notes"\r\n`;

  monthlyAttendance
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((att) => {
      const emp = employees.find((e) => e.id === att.employeeId);
      csv += `"${att.date}","${emp?.empId || "—"}","${emp?.name || "—"}","${emp ? getAttendanceTeam(emp) : "—"}","${emp?.department || "—"}","${att.status}","${att.checkInTime || "—"}","${att.checkOutTime || "—"}","${(att.notes || "").replace(/"/g, '""')}"\r\n`;
    });

  return { csv, fileName, monthName };
}

// Save Report directly to Server Folder as a Node.js Stream
export async function saveReportStreamToFolder(
  month: string,
  format: "excel" | "csv" = "excel",
  subFolder?: string
): Promise<SavedReportMetadata> {
  const targetDir = subFolder
    ? path.join(REPORTS_BASE_DIR, subFolder)
    : path.join(REPORTS_BASE_DIR, month);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let content: string;
  let fileName: string;

  if (format === "csv") {
    const res = generateCsvContent(month);
    content = res.csv;
    fileName = res.fileName;
  } else {
    const res = generateExcelXml(month);
    content = res.xml;
    fileName = res.fileName;
  }

  const filePath = path.join(targetDir, fileName);

  // Stream write to disk using pipeline
  const sourceStream = Readable.from(Buffer.from(content, "utf-8"));
  const destinationStream = fs.createWriteStream(filePath);

  await pipeline(sourceStream, destinationStream);

  const stats = fs.statSync(filePath);
  const relativePath = path.relative(REPORTS_BASE_DIR, filePath).replace(/\\/g, "/");

  return {
    fileName,
    folderPath: targetDir,
    relativePath,
    month,
    format,
    sizeBytes: stats.size,
    sizeFormatted: formatBytes(stats.size),
    createdAt: stats.birthtime.toISOString(),
    downloadUrl: `/api/attendance/reports/download?file=${encodeURIComponent(relativePath)}`,
  };
}

// List all saved reports across the reports directory tree
export function getSavedReportsInFolder(): SavedReportMetadata[] {
  if (!fs.existsSync(REPORTS_BASE_DIR)) {
    return [];
  }

  const results: SavedReportMetadata[] = [];

  function scanDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".xls") || entry.name.endsWith(".csv"))) {
        const stats = fs.statSync(fullPath);
        const relativePath = path.relative(REPORTS_BASE_DIR, fullPath).replace(/\\/g, "/");
        const format: "excel" | "csv" = entry.name.endsWith(".xls") ? "excel" : "csv";

        // Extract month from filename e.g. BY_Technologies_Attendance_2026-09.xls
        const match = entry.name.match(/(\d{4}-\d{2})/);
        const month = match ? match[1] : path.basename(path.dirname(fullPath));

        results.push({
          fileName: entry.name,
          folderPath: path.dirname(fullPath),
          relativePath,
          month,
          format,
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
          downloadUrl: `/api/attendance/reports/download?file=${encodeURIComponent(relativePath)}`,
        });
      }
    }
  }

  scanDir(REPORTS_BASE_DIR);

  // Sort newest first
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Delete a saved report from the folder
export function deleteSavedReport(relativePath: string): boolean {
  try {
    const resolvedPath = path.resolve(REPORTS_BASE_DIR, relativePath);
    // Security check against directory traversal
    if (!resolvedPath.startsWith(path.resolve(REPORTS_BASE_DIR))) {
      throw new Error("Invalid file path");
    }

    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      // Clean up empty directory if empty
      const parentDir = path.dirname(resolvedPath);
      if (parentDir !== path.resolve(REPORTS_BASE_DIR)) {
        try {
          const files = fs.readdirSync(parentDir);
          if (files.length === 0) {
            fs.rmdirSync(parentDir);
          }
        } catch (_) {}
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to delete saved report:", err);
    return false;
  }
}
