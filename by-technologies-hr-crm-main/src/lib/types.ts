export type UserRole = "admin" | "employee";

export * from "./designations";

export interface Employee {
  id: string;
  empId: string; // e.g. BYT-101 (Primary login identifier)
  name: string;
  email?: string; // Optional - no mail ID needed
  phone: string;
  designation: string;
  department: string;
  dateOfJoining: string; // YYYY-MM-DD
  status: "active" | "inactive";
  password: string; // portal password
  avatarUrl?: string;
  dob?: string; // Date of Birth (YYYY-MM-DD or DD/MM/YYYY)
  addressLine1?: string; // Door/Flat & Street
  addressLine2?: string; // Area / Locality
  cityStatePin?: string; // City, State - Pincode
  annualSalary?: number; // CTC in INR
  monthlySalary?: number; // Monthly pay in INR
  workTimings?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  visitingCard?: VisitingCardData;
  createdAt: string;
  updatedAt: string;
}

export interface ElementLayout {
  x: number; // percentage of card width (0 - 100)
  y: number; // percentage of card height (0 - 100)
  fontSize: number; // font size in canvas px
  textAlign?: "left" | "center" | "right";
}

export interface CardLayoutSettings {
  name: ElementLayout;
  designation: ElementLayout;
  phone: ElementLayout;
  email: ElementLayout;
  website: ElementLayout;
  address: ElementLayout;
}

export interface VisitingCardData {
  name: string;
  designation: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  layout?: CardLayoutSettings;
  updatedAt?: string;
}

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Half day" | "On Leave";
export type WorkType = "Office" | "Remote (WFH)" | "Client Site";

export type AttendanceTeam =
  | "Sales"
  | "Marketing"
  | "Technical"
  | "Management"
  | "Support"
  | "Human Resource";

export const ATTENDANCE_TEAMS: AttendanceTeam[] = [
  "Sales",
  "Marketing",
  "Technical",
  "Management",
  "Support",
  "Human Resource",
];

export function getAttendanceTeam(employee: { designation?: string; department?: string }): AttendanceTeam {
  const des = (employee?.designation || "").toLowerCase();
  const dep = (employee?.department || "").toLowerCase();
  const combined = `${des} ${dep}`;

  if (
    combined.includes("human resource") ||
    combined.includes("people operations") ||
    combined.includes("recruiter") ||
    combined.includes("talent acquisition") ||
    combined.includes("hr manager") ||
    combined.includes("hr executive") ||
    des === "hr" ||
    des.includes(" hr") ||
    des.includes("hr ") ||
    dep === "hr" ||
    dep.includes("hr")
  ) {
    return "Human Resource";
  }

  if (
    combined.includes("managing director") ||
    combined.includes("general manager") ||
    combined.includes("executive leadership") ||
    combined.includes("operations & management") ||
    combined.includes("director") ||
    (combined.includes("management") && !combined.includes("tech team manager"))
  ) {
    return "Management";
  }

  if (
    combined.includes("tech") ||
    combined.includes("developer") ||
    combined.includes("engineer") ||
    combined.includes("ui/ux") ||
    combined.includes("graphic designer") ||
    combined.includes("creative studio") ||
    combined.includes("fullstack") ||
    combined.includes("frontend") ||
    combined.includes("backend")
  ) {
    return "Technical";
  }

  if (
    combined.includes("seo") ||
    combined.includes("marketing") ||
    combined.includes("growth") ||
    combined.includes("social media") ||
    combined.includes("content") ||
    combined.includes("organic")
  ) {
    return "Marketing";
  }

  if (
    combined.includes("support") ||
    combined.includes("customer success") ||
    combined.includes("helpdesk")
  ) {
    return "Support";
  }

  if (
    combined.includes("sales") ||
    combined.includes("bdm") ||
    combined.includes("bde") ||
    combined.includes("business development") ||
    combined.includes("telecall") ||
    combined.includes("process associate") ||
    combined.includes("outreach") ||
    combined.includes("client outreach")
  ) {
    return "Sales";
  }

  return "Technical";
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  workType?: WorkType;
  checkInTime?: string; // e.g. "09:15 AM"
  checkOutTime?: string; // e.g. "06:30 PM"
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeaveType =
  | "Casual Leave"
  | "Sick Leave"
  | "Paid Time Off"
  | "Half Day Leave"
  | "Unpaid Leave";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  leaveType: LeaveType;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string; // YYYY-MM-DD
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface LoginLog {
  id: string;
  employeeId: string;
  empId?: string; // e.g. BYT-101
  employeeName: string;
  email?: string;
  loginTime: string; // ISO string
  ipAddress: string;
  userAgent: string;
}

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  openingsCount: number;
  status: "open" | "closed";
  postedDate: string; // YYYY-MM-DD
  experience: string;
  jobType: "Full-time" | "Hybrid" | "Remote" | "Internship";
  description: string;
  requirements?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminCredentials {
  name: string;
  password: string;
}

export interface AuthSession {
  role: UserRole;
  employee?: Employee;
  adminName?: string;
  token?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'admin' or employee ID e.g. 'emp_1'
  senderName: string;
  senderEmpId?: string; // 'HR-ADMIN' or 'BYT-101'
  senderDesignation?: string;
  senderRole?: UserRole;
  recipientId?: string; // If set, this is a 1-on-1 Direct Message (DM)
  channelId?: string; // If set, this is a Group Channel message
  text: string;
  content?: string;
  timestamp: string; // ISO string
  createdAt?: string;
  readBy: string[]; // Array of user IDs who have read this message
}

export interface ChatChannel {
  id: string; // e.g. 'general', 'management'
  name: string; // e.g. '#general'
  description: string;
  isGroup: boolean;
  memberIds: string[]; // ['all'] or array of IDs
  createdAt: string;
}

