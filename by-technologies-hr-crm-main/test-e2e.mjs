// Comprehensive E2E HTTP verification test against http://localhost:3000

const BASE = "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("   B & Y TECHNOLOGIES - UPDATED E2E TEST SUITE    ");
  console.log("==================================================");

  // 1. Root page HTML
  console.log("\n1. Testing Frontend Home Page...");
  const pageRes = await fetch(`${BASE}/`);
  assert(pageRes.status === 200, "Home page loaded with status 200");
  const html = await pageRes.text();
  assert(
    html.includes("B &amp; Y TECHNOLOGIES") || html.includes("B & Y TECHNOLOGIES"),
    "Page contains brand name B & Y TECHNOLOGIES"
  );

  // 2. Admin Login
  console.log("\n2. Testing HR Admin Authentication...");
  const adminLoginRes = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin", username: "admin", password: "admin123" }),
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminData.success === true, "HR Admin login succeeds with valid credentials");

  // 3. Employee Login by Employee ID (NO EMAIL NEEDED)
  console.log("\n3. Testing Employee Login by Employee ID (No Email Required)...");
  const empLoginByIdRes = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "E2E-Automated-Test-Browser" },
    body: JSON.stringify({
      role: "employee",
      identifier: "BYT-101", // Login with Employee ID!
      password: "Krish@123",
    }),
  });
  const empByIdData = await empLoginByIdRes.json();
  assert(
    empLoginByIdRes.status === 200 && empByIdData.success === true,
    "Employee successfully logged in using Employee ID 'BYT-101' without email"
  );
  assert(
    empByIdData.employee.empId === "BYT-101" && empByIdData.employee.name === "Krish Babu",
    `Employee profile for ID login resolved correctly (empId: ${empByIdData.employee.empId}, name: ${empByIdData.employee.name})`
  );

  // 4. Employee Login by Name (Fallback / Alternative)
  console.log("\n4. Testing Employee Login by Full Name...");
  const empLoginByNameRes = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "employee",
      identifier: "DilipKumar", // Login with Full Name!
      password: "Dilip@123",
    }),
  });
  const empByNameData = await empLoginByNameRes.json();
  assert(
    empLoginByNameRes.status === 200 && empByNameData.success === true,
    "Employee successfully logged in using Name 'DilipKumar' without email"
  );
  assert(
    empByNameData.employee.empId === "BYT-102" && empByNameData.employee.designation === "Sr BDM",
    `Profile for DilipKumar (BYT-102, Sr BDM) resolved correctly`
  );

  // 5. Inactive Employee Login Block by ID
  console.log("\n5. Testing Inactive Employee Login Block by Employee ID...");
  const tempInactiveRes = await fetch(`${BASE}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Temp Inactive User",
      phone: "+91 99999 00000",
      designation: "Process Associate",
      department: "Operations",
      dateOfJoining: "2026-09-01",
      status: "inactive",
      password: "inactivePass123",
    }),
  });
  const tempInactiveData = await tempInactiveRes.json();
  const tempInactiveId = tempInactiveData.employee?.id;
  const tempInactiveEmpId = tempInactiveData.employee?.empId;

  const inactiveLoginRes = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "employee",
      identifier: tempInactiveEmpId,
      password: "inactivePass123",
    }),
  });
  const inactiveData = await inactiveLoginRes.json();
  assert(
    inactiveLoginRes.status === 403 && inactiveData.success === false,
    `Inactive employee (${tempInactiveEmpId}) login rejected with 403 Forbidden`
  );
  assert(
    inactiveData.error.includes("INACTIVE"),
    "Rejection message explicitly states account is INACTIVE"
  );

  if (tempInactiveId) {
    await fetch(`${BASE}/api/employees/${tempInactiveId}`, { method: "DELETE" });
  }

  // 6. Verify All 14 Official Agency Designations in Directory
  console.log("\n6. Testing All 14 Official Agency Designations...");
  const empListRes = await fetch(`${BASE}/api/employees`);
  const empListData = await empListRes.json();
  assert(empListRes.status === 200 && empListData.success === true, "Employees API returned 200 OK");
  assert(empListData.employees.length >= 14, `Employees list contains ${empListData.employees.length} records (>= 14)`);

  const expectedDesignations = [
    "General Manager",
    "Sr BDM",
    "Tech Team Manager",
    "Customer Support",
    "UI/UX Developer",
    "Sr SEO Analyst",
    "SEO Analyst",
    "FullStack Developer",
    "Managing Director",
    "HR",
    "Team Leader (Telecaller)",
    "Process Associate",
    "BDE",
    "BDM",
  ];

  const presentDesignations = empListData.employees.map((e) => e.designation.toLowerCase());
  const foundDesignations = expectedDesignations.filter((des) =>
    presentDesignations.some((p) => p.includes(des.toLowerCase()) || des.toLowerCase().includes(p))
  );
  assert(
    foundDesignations.length >= 8,
    `Active employee roster contains diverse agency roles (${foundDesignations.length} distinct designations present)`
  );

  // 7. Check Login Times Audit Log (Section 4)
  console.log("\n7. Testing Login Times Audit Log (Section 4)...");
  const logsRes = await fetch(`${BASE}/api/logs`);
  const logsData = await logsRes.json();
  assert(logsRes.status === 200 && logsData.success === true, "Login logs API responds 200");
  const recentLog = logsData.logs[0];
  assert(
    recentLog && (recentLog.empId === "BYT-101" || recentLog.empId === "BYT-102"),
    `Latest login audit recorded employee ID: ${recentLog?.empId} (${recentLog?.employeeName})`
  );

  // 8. Monthly Attendance Report - Excel Stream (.xls)
  console.log("\n8. Testing Monthly Attendance Report - Direct Excel Stream (.xls)...");
  const excelRes = await fetch(`${BASE}/api/attendance/export?month=2026-09&format=excel`);
  assert(excelRes.status === 200, "Excel export endpoint responded 200 OK");
  const contentType = excelRes.headers.get("content-type") || "";
  assert(
    contentType.includes("vnd.ms-excel"),
    `Content-Type is Excel spreadsheet stream (${contentType})`
  );
  const disposition = excelRes.headers.get("content-disposition") || "";
  assert(
    disposition.includes("BY_Technologies_Attendance_2026-09.xls"),
    `Content-Disposition attachment filename set properly: ${disposition}`
  );
  const excelXml = await excelRes.text();
  assert(
    excelXml.includes("Monthly Summary") &&
      excelXml.includes("Daily Attendance Matrix") &&
      excelXml.includes("Detailed Attendance Logs"),
    "Excel workbook contains all 3 structured worksheets: Summary, Matrix, and Logs"
  );
  assert(
    excelXml.includes("B &amp; Y TECHNOLOGIES"),
    "Excel workbook contains B & Y Technologies brand header"
  );

  // 9. Monthly Attendance Report - CSV Stream (.csv)
  console.log("\n9. Testing Monthly Attendance Report - CSV Stream (.csv)...");
  const csvRes = await fetch(`${BASE}/api/attendance/export?month=2026-09&format=csv`);
  assert(csvRes.status === 200, "CSV export endpoint responded 200 OK");
  const csvBuffer = await csvRes.arrayBuffer();
  const bytes = new Uint8Array(csvBuffer);
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const csvText = new TextDecoder("utf-8").decode(csvBuffer);
  assert(
    csvText.includes("SECTION 1: MONTHLY EMPLOYEE SUMMARY") &&
      csvText.includes("SECTION 2: DAILY ATTENDANCE MATRIX") &&
      csvText.includes("SECTION 3: DETAILED TIME LOGS"),
    "CSV stream contains all 3 reporting sections"
  );
  assert(
    hasBom,
    `CSV stream includes UTF-8 BOM (0xEF, 0xBB, 0xBF) for seamless Microsoft Excel opening`
  );

  // 10. Save Monthly Attendance Report directly to Server Folder as Stream
  console.log("\n10. Testing Saving Report to Server Folder as Stream...");
  const saveFolderRes = await fetch(`${BASE}/api/attendance/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month: "2026-09", format: "excel" }),
  });
  const saveFolderData = await saveFolderRes.json();
  assert(
    saveFolderRes.status === 200 && saveFolderData.success === true,
    `Excel attendance report successfully streamed and saved into folder: ${saveFolderData.report?.relativePath}`
  );
  assert(
    saveFolderData.report?.sizeBytes > 1000,
    `Saved Excel report has valid file size (${saveFolderData.report?.sizeFormatted})`
  );

  // 11. List Saved Reports in Server Folders
  console.log("\n11. Testing Listing Saved Reports in Server Folders...");
  const listReportsRes = await fetch(`${BASE}/api/attendance/reports`);
  const listReportsData = await listReportsRes.json();
  assert(
    listReportsRes.status === 200 && listReportsData.success === true,
    `Reports archive API responded 200 with ${listReportsData.reports?.length} files in folders`
  );
  assert(
    listReportsData.reports.some((r) => r.month === "2026-09" && r.format === "excel"),
    "Saved 2026-09 Excel file is indexed in server folder catalog"
  );

  // 12. Stream Saved Report from Server Folder
  console.log("\n12. Testing Streaming Report from Server Folder to Client...");
  const firstSaved = listReportsData.reports[0];
  const streamFromFolderRes = await fetch(`${BASE}${firstSaved.downloadUrl}`);
  assert(
    streamFromFolderRes.status === 200,
    `Stream from folder endpoint returned status 200 for ${firstSaved.fileName}`
  );
  const streamContentType = streamFromFolderRes.headers.get("content-type") || "";
  assert(
    streamContentType.includes("vnd.ms-excel") || streamContentType.includes("text/csv"),
    `Stream content type valid: ${streamContentType}`
  );
  const streamBytes = await streamFromFolderRes.arrayBuffer();
  assert(
    streamBytes.byteLength === firstSaved.sizeBytes,
    `Streamed byte length (${streamBytes.byteLength}) matches saved file on disk (${firstSaved.sizeBytes})`
  );

  // 13. Employee Creation with Official Designation (NO EMAIL NEEDED)
  console.log("\n13. Testing Employee Creation with Official Designation (No Email)...");
  const newEmpRes = await fetch(`${BASE}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Sanjay Rajan",
      phone: "+91 98409 11224",
      designation: "Tech Team Manager",
      department: "Web & Tech Engineering",
      dateOfJoining: "2026-09-01",
      status: "active",
      password: "sanjaypass123",
      // Zero email provided!
    }),
  });
  const newEmpData = await newEmpRes.json();
  assert(
    newEmpRes.status === 201 && newEmpData.success === true,
    "Employee created successfully with 'Tech Team Manager' designation and ZERO email ID required"
  );
  const sanjayEmpId = newEmpData.employee.empId;
  const sanjayInternalId = newEmpData.employee.id;

  // Test Sanjay logging in immediately with his new Employee ID!
  const sanjayLoginRes = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "employee",
      identifier: sanjayEmpId,
      password: "sanjaypass123",
    }),
  });
  const sanjayLoginData = await sanjayLoginRes.json();
  assert(
    sanjayLoginRes.status === 200 && sanjayLoginData.success === true,
    `Newly created employee Sanjay (${sanjayEmpId}) logged in successfully with Employee ID`
  );

  // Clean up Sanjay
  await fetch(`${BASE}/api/employees/${sanjayInternalId}`, { method: "DELETE" });

  // 14. Attendance Month-wise Matrix & Edit Type Verification
  console.log("\n14. Testing Month-wise Attendance Matrix & Edit Type...");
  const targetEmployee = empListData.employees[0];
  const editAttRes = await fetch(`${BASE}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: targetEmployee.id,
      date: "2026-09-18",
      status: "Half day",
      workType: "Remote (WFH)",
      checkInTime: "09:30 AM",
      checkOutTime: "01:45 PM",
      notes: "Approved remote half-day for medical checkup",
    }),
  });
  const editAttData = await editAttRes.json();
  assert(
    editAttRes.status === 200 && editAttData.success === true,
    "Attendance record updated with status 'Half day' and workType 'Remote (WFH)'"
  );
  assert(
    editAttData.attendance.workType === "Remote (WFH)" && editAttData.attendance.status === "Half day",
    "Returned attendance record contains customized status and workType"
  );

  // Fetch month attendance
  const monthAttRes = await fetch(`${BASE}/api/attendance?month=2026-09`);
  const monthAttData = await monthAttRes.json();
  assert(
    monthAttRes.status === 200 && monthAttData.success === true && Array.isArray(monthAttData.attendance),
    `Fetched monthly attendance records for 2026-09 (${monthAttData.attendance.length} records)`
  );
  const foundRec = monthAttData.attendance.find((a) => a.employeeId === targetEmployee.id && a.date === "2026-09-18");
  assert(
    foundRec && foundRec.status === "Half day" && foundRec.workType === "Remote (WFH)",
    "Verified modified shift and type persisted in monthly calendar dataset"
  );

  // 15. NEW FEATURE: Letter Of Offer 3-Page Official Format Preview (HTML)
  console.log("\n15. Testing Official 3-Page Letter Of Offer HTML Preview...");
  const offerPreviewRes = await fetch(
    `${BASE}/api/workspace/download?generate=offer_letter&format=html&empId=BYT-101`
  );
  assert(offerPreviewRes.status === 200, "Letter Of Offer HTML preview returned 200 OK");
  const offerHtml = await offerPreviewRes.text();
  assert(
    offerHtml.includes("Letter Of Offer") &&
      offerHtml.includes("624, Anna salai, 4th floor khivraj Building near gemini flyover chennai - 600 006"),
    "Page 1 contains official B&Y header and Anna Salai registered office address"
  );
  assert(
    offerHtml.includes("General Terms") &&
      offerHtml.includes("Monday to Friday") &&
      offerHtml.includes("9:30 am to 6:30 pm"),
    "Page 2 Annexure contains working hours and general terms"
  );
  assert(
    offerHtml.includes("Code of Conduct") &&
      offerHtml.includes("7 days") &&
      offerHtml.includes("Babu B"),
    "Page 3 contains Code of Conduct, 7-day salary hold clause, and Babu B signature block"
  );

  // 16. NEW FEATURE: Letter Of Offer Word (.doc) Stream Download
  console.log("\n16. Testing Official 3-Page Letter Of Offer Word (.doc) Download...");
  const offerWordRes = await fetch(`${BASE}/api/workspace/download?generate=offer_letter&empId=BYT-101`);
  assert(offerWordRes.status === 200, "Letter Of Offer Word download returned 200 OK");
  const offerWordType = offerWordRes.headers.get("content-type") || "";
  assert(
    offerWordType.includes("application/msword"),
    `Word (.doc) MIME type returned correctly: ${offerWordType}`
  );
  const offerWordDisposition = offerWordRes.headers.get("content-disposition") || "";
  assert(
    offerWordDisposition.includes("Letter_Of_Offer_BYT-101_Krish_Babu.doc"),
    `Content-Disposition header matches official naming: ${offerWordDisposition}`
  );
  const offerWordText = await offerWordRes.text();
  assert(
    offerWordText.includes("mso-special-character:line-break;page-break-before:always"),
    "Word document contains native Microsoft Word pagination breaks for true 3-page rendering"
  );

  // 17. NEW FEATURE: Save Customized Letter Of Offer to HR Vault Folder
  console.log("\n17. Testing Saving Customized Letter Of Offer to HR Vault...");
  const saveCustomOfferRes = await fetch(`${BASE}/api/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docType: "offer_letter",
      customOfferData: {
        candidateName: "Rohan Patel",
        candidateAddressLine1: "Flat 4B, Emerald Heights",
        candidateAddressLine2: "T. Nagar",
        candidateCityStatePin: "Chennai - 600017",
        dob: "1998-05-14",
        designation: "UI/UX Developer",
        annualSalary: 420000,
        monthlySalary: 35000,
        signatoryName: "Babu B",
        signatoryTitle: "Branch Manager",
      },
    }),
  });
  const saveCustomOfferData = await saveCustomOfferRes.json();
  assert(
    saveCustomOfferRes.status === 200 && saveCustomOfferData.success === true,
    `Custom Offer Letter successfully saved to HR Vault: ${saveCustomOfferData.file?.fileName}`
  );

  // 18. HR Workspace Excel Master Generation
  console.log("\n18. Testing HR Workspace Excel Master Generation...");
  const excelMasterRes = await fetch(`${BASE}/api/workspace/download?generate=excel-master`);
  assert(
    excelMasterRes.status === 200,
    "HR Workspace Excel Master (.xls) stream endpoint returned status 200"
  );
  const excelMasterContent = await excelMasterRes.text();
  assert(
    excelMasterContent.includes("B &amp; Y Technologies") &&
      excelMasterContent.includes("Employee Directory Master") &&
      excelMasterContent.includes("BYT-101"),
    "Excel Master contains company branding and full employee roster XML sheets"
  );

  // 19. Team Connect Chat Channels
  console.log("\n19. Testing Team Connect Chat Channels...");
  const channelsRes = await fetch(`${BASE}/api/chat/channels`);
  const channelsData = await channelsRes.json();
  assert(
    channelsRes.status === 200 && channelsData.success === true && Array.isArray(channelsData.channels),
    `Fetched ${channelsData.channels.length} team chat channels`
  );
  const generalChannel = channelsData.channels.find((c) => c.id === "general");
  assert(
    generalChannel && generalChannel.name === "#general",
    "Default group channel #general is active and accessible to all staff"
  );

  // 20. Team Connect Group Message, 1-on-1 DMs, & Unread Notifications
  console.log("\n20. Testing Team Connect DMs, Group Chat, & Unread Notifications...");
  // Post message to #general
  const postGroupRes = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      senderId: "admin",
      senderName: "HR Administrator",
      senderRole: "admin",
      senderDesignation: "HR Administration",
      channelId: "general",
      text: "Welcome to B & Y Technologies Team Connect! Chat is now live for all 14 agency roles.",
    }),
  });
  const postGroupData = await postGroupRes.json();
  assert(
    postGroupRes.status === 201 && postGroupData.success === true,
    "HR Admin posted announcement to #general channel successfully"
  );

  // Post 1-on-1 DM from HR Admin to target employee
  const postDmRes = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      senderId: "admin",
      senderName: "HR Administrator",
      senderRole: "admin",
      senderDesignation: "HR Administration",
      recipientId: targetEmployee.id,
      text: `Hi ${targetEmployee.name}, your official offer letter is archived in the HR Vault.`,
    }),
  });
  const postDmData = await postDmRes.json();
  assert(
    postDmRes.status === 201 && postDmData.success === true,
    `HR Admin sent 1-on-1 Direct Message to ${targetEmployee.name} (${targetEmployee.empId})`
  );

  // Check unread count for target employee
  const unreadRes = await fetch(`${BASE}/api/chat?userId=${targetEmployee.id}&countOnly=true`);
  const unreadData = await unreadRes.json();
  assert(
    unreadRes.status === 200 && unreadData.success === true && unreadData.bySender["admin"] >= 1,
    `Unread notification active for ${targetEmployee.name}: ${unreadData.bySender["admin"]} new message(s) from HR Admin`
  );

  // Mark messages as read
  const readRes = await fetch(`${BASE}/api/chat/read`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: targetEmployee.id, senderId: "admin" }),
  });
  const readData = await readRes.json();
  assert(
    readRes.status === 200 && readData.success === true,
    "Marked DM conversation as read successfully"
  );

  // Verify unread count reset for admin DMs
  const unreadAfterRes = await fetch(`${BASE}/api/chat?userId=${targetEmployee.id}&countOnly=true`);
  const unreadAfterData = await unreadAfterRes.json();
  assert(
    unreadAfterRes.status === 200 && (!unreadAfterData.bySender["admin"] || unreadAfterData.bySender["admin"] === 0),
    "Unread DM counter correctly cleared after viewing the conversation"
  );

  // 21. Testing Letter Of Offer Studio & Custom Fields...
  console.log("\n21. Testing Letter Of Offer Studio & Custom Fields...");
  
  // 21a. Update employee with DOB, Address, and Salary
  const updateEmpRes = await fetch(`${BASE}/api/employees/${targetEmployee.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dob: "1997-08-22",
      addressLine1: "Flat 4B, Emerald Heights, GST Road",
      addressLine2: "Guindy Industrial Estate",
      cityStatePin: "Chennai, Tamil Nadu - 600032",
      annualSalary: 420000,
      monthlySalary: 35000,
      workTimings: "Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm.",
      signatoryName: "Babu B",
      signatoryTitle: "Branch Manager",
    }),
  });
  const updateEmpData = await updateEmpRes.json();
  assert(
    updateEmpRes.status === 200 && updateEmpData.success === true,
    "Updated employee record with DOB, Residential Address, and Custom CTC"
  );
  assert(
    updateEmpData.employee.dob === "1997-08-22" &&
    updateEmpData.employee.annualSalary === 420000 &&
    updateEmpData.employee.cityStatePin === "Chennai, Tamil Nadu - 600032",
    "Verified persisted employee personal fields (DOB, Annual CTC, City/PIN)"
  );

  // 21b. Generate / Preview Offer Letter HTML with customized parameters
  const offerHtmlUrl = `${BASE}/api/workspace/download?generate=offer_letter&format=html&candidateName=${encodeURIComponent("Priya Sharma")}&designation=${encodeURIComponent("UI/UX Developer")}&empId=BYT-777&dob=1999-04-12&addressLine1=${encodeURIComponent("No 42, 3rd Cross Street")}&cityStatePin=${encodeURIComponent("Chennai, Tamil Nadu - 600028")}&annualSalary=480000&monthlySalary=40000&offerDate=2026-09-05&doj=2026-09-15&signatoryName=${encodeURIComponent("Babu B")}&signatoryTitle=${encodeURIComponent("Branch Manager")}`;
  const offerHtmlRes = await fetch(offerHtmlUrl);
  assert(offerHtmlRes.status === 200, "Offer Letter HTML preview generated with status 200");
  const offerHtmlText = await offerHtmlRes.text();
  assert(
    offerHtmlText.includes("Priya Sharma") &&
    offerHtmlText.includes("UI/UX Developer") &&
    offerHtmlText.includes("12/04/1999") &&
    offerHtmlText.includes("No 42, 3rd Cross Street") &&
    offerHtmlText.includes("4,80,000") &&
    offerHtmlText.includes("Rupees Four Lakh Eighty Thousand Only") &&
    offerHtmlText.includes("Babu B"),
    "Offer Letter HTML contains all customized fields: Candidate Name, DOB, Address, Formatted CTC, Indian Words, and Signatory"
  );

  // 21c. Save customized offer letter to HR Vault via POST /api/workspace
  const saveCustomStudioOfferRes = await fetch(`${BASE}/api/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docType: "offer_letter",
      empId: targetEmployee.empId,
      customOfferData: {
        candidateName: targetEmployee.name,
        empId: targetEmployee.empId,
        designation: targetEmployee.designation,
        dob: "1997-08-22",
        addressLine1: "Flat 4B, Emerald Heights, GST Road",
        addressLine2: "Guindy Industrial Estate",
        cityStatePin: "Chennai, Tamil Nadu - 600032",
        annualSalary: 420000,
        monthlySalary: 35000,
        offerDate: "2026-09-05",
        dateOfJoining: "2026-09-15",
        signatoryName: "Babu B",
        signatoryTitle: "Branch Manager",
        workTimings: "Monday to Friday - 9:30 am to 6:30 pm. | Saturday 9:30 am to 6:30 pm.",
      },
    }),
  });
  const saveCustomStudioOfferData = await saveCustomStudioOfferRes.json();
  assert(
    saveCustomStudioOfferRes.status === 200 && saveCustomStudioOfferData.success === true,
    `Customized Offer Letter successfully streamed and saved to HR Vault (.doc): ${saveCustomStudioOfferData.file?.fileName}`
  );

  console.log("\n==================================================");
  console.log(`ALL TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("E2E Test encountered unexpected error:", err);
  process.exit(1);
});
