import fs from "fs";
import path from "path";
import {
  readDatabase,
  getEmployees,
  getEmployeeByEmail,
  getEmployeeById,
  saveEmployee,
  deleteEmployee,
  getNextEmpId,
  getAttendance,
  saveAttendance,
  getLeaves,
  saveLeave,
  getLoginLogs,
  addLoginLog,
  getJobs,
  saveJob,
  deleteJob,
} from "./src/lib/db.ts";

console.log("==================================================");
console.log("   B & Y TECHNOLOGIES HR CRM - VERIFICATION TEST   ");
console.log("==================================================");

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

// 1. Check Seed Data & DB Existence
console.log("\n1. Testing Database & Seed Data Initialization...");
const db = readDatabase();
assert(db !== null && typeof db === "object", "Database read successfully");
assert(db.admin.name === "admin" && db.admin.password === "admin123", "Admin credentials configured correctly");
assert(db.employees.length >= 7, `Found ${db.employees.length} pre-seeded employees (Expected >= 7)`);

// 2. Test Employee Roles and Statuses
console.log("\n2. Testing Employee Records & Active/Inactive State...");
const priya = getEmployeeByEmail("priya@bytechnologies.com");
assert(priya !== undefined, "Priya Sharma (SEO Lead) found by email");
assert(priya?.status === "active", "Priya account is active");

const meera = getEmployeeByEmail("meera@bytechnologies.com");
assert(meera !== undefined, "Meera Iyer found by email");
assert(meera?.status === "inactive", "Meera account is marked inactive (for inactive testing)");

// 3. Test ID Generation
console.log("\n3. Testing Employee ID Sequence Generator...");
const nextId = getNextEmpId();
assert(nextId.startsWith("BYT-"), `Next Employee ID is generated with proper format: ${nextId}`);

// 4. Test Employee CRUD
console.log("\n4. Testing Employee CRUD Operations...");
const testEmp = {
  id: `test_emp_${Date.now()}`,
  empId: nextId,
  name: "Test Developer",
  email: "test.dev@bytechnologies.com",
  phone: "+91 99999 88888",
  designation: "Frontend React Engineer",
  department: "Web & Tech Engineering",
  dateOfJoining: "2026-09-05",
  status: "active",
  password: "testpassword",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
saveEmployee(testEmp);
const retrieved = getEmployeeById(testEmp.id);
assert(retrieved?.name === "Test Developer", "New employee created and retrieved");

// Edit employee
retrieved.designation = "Senior Frontend React Engineer";
saveEmployee(retrieved);
const updated = getEmployeeById(testEmp.id);
assert(updated?.designation === "Senior Frontend React Engineer", "Employee record updated successfully");

// Delete employee
deleteEmployee(testEmp.id);
const deleted = getEmployeeById(testEmp.id);
assert(deleted === undefined, "Employee record deleted successfully");

// 5. Test Attendance Operations
console.log("\n5. Testing Attendance Tracking...");
const todayStr = new Date().toISOString().split("T")[0];
const testAtt = {
  id: `test_att_${Date.now()}`,
  employeeId: "emp_1",
  date: todayStr,
  status: "Present",
  checkInTime: "09:05 AM",
  checkOutTime: "06:10 PM",
  notes: "Office Studio",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
saveAttendance(testAtt);
const attList = getAttendance({ date: todayStr, employeeId: "emp_1" });
assert(attList.length > 0 && attList[0].status === "Present", "Attendance marked and retrieved");

// 6. Test Leave Management & Sync
console.log("\n6. Testing Leave Application & Approval...");
const testLeave = {
  id: `test_lev_${Date.now()}`,
  employeeId: "emp_2",
  employeeName: "Rahul Verma",
  department: "Paid Advertising",
  leaveType: "Sick Leave",
  fromDate: "2026-10-01",
  toDate: "2026-10-02",
  days: 2,
  reason: "Medical procedure",
  status: "Pending",
  appliedDate: todayStr,
  createdAt: new Date().toISOString(),
};
saveLeave(testLeave);
const userLeaves = getLeaves("emp_2");
assert(userLeaves.some((l) => l.id === testLeave.id), "Leave application recorded in user history");

// Approve Leave
testLeave.status = "Approved";
testLeave.reviewNote = "Approved by HR Admin";
saveLeave(testLeave);
const approvedLeave = getLeaves("emp_2").find((l) => l.id === testLeave.id);
assert(approvedLeave?.status === "Approved", "Leave approved by HR successfully");

// 7. Test Login Audit Log
console.log("\n7. Testing Login Audit Logs...");
const testLog = addLoginLog({
  employeeId: "emp_1",
  employeeName: "Priya Sharma",
  email: "priya@bytechnologies.com",
  loginTime: new Date().toISOString(),
  ipAddress: "192.168.1.100",
  userAgent: "Antigravity Automated Test Suite",
});
assert(testLog.id.startsWith("log_"), "Audit log entry created with unique ID");
const logs = getLoginLogs(10);
assert(logs.some((l) => l.id === testLog.id), "Audit log verified in security log stream");

// 8. Test Recruitment Job Openings
console.log("\n8. Testing Recruitment & Job Openings...");
const testJob = {
  id: `test_job_${Date.now()}`,
  title: "Head of Influencer Marketing",
  department: "Social Media & PR",
  openingsCount: 1,
  status: "open",
  postedDate: todayStr,
  experience: "5+ years",
  jobType: "Full-time",
  description: "Lead creator and influencer partnerships across India.",
  requirements: ["Proven agency network", "Creator budget management"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
saveJob(testJob);
const jobs = getJobs();
assert(jobs.some((j) => j.id === testJob.id), "Job opening created successfully");
deleteJob(testJob.id);
assert(!getJobs().some((j) => j.id === testJob.id), "Job opening deleted successfully");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");
if (failed > 0) process.exit(1);
