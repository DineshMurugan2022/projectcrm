import fs from "fs";
import path from "path";
import os from "os";
import {
  Employee,
  Attendance,
  LeaveRequest,
  LoginLog,
  JobOpening,
  AdminCredentials,
  ChatMessage,
  ChatChannel,
  VisitingCardData,
} from "./types";

interface DatabaseSchema {
  admin: AdminCredentials;
  employees: Employee[];
  attendance: Attendance[];
  leaves: LeaveRequest[];
  loginLogs: LoginLog[];
  jobs: JobOpening[];
  chatMessages: ChatMessage[];
  chatChannels: ChatChannel[];
}

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "database.json");
const VERCEL_TMP_PATH = path.join(os.tmpdir(), "by_technologies_database.json");

function getDbPath(): string {
  if (process.env.VERCEL) {
    return VERCEL_TMP_PATH;
  }
  return DEFAULT_DB_PATH;
}

// Helper to format dates YYYY-MM-DD
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayString(): string {
  return formatDate(new Date());
}

export function getDefaultChannels(): ChatChannel[] {
  const now = new Date().toISOString();
  return [
    {
      id: "general",
      name: "#general",
      description: "Company-wide announcements, agency updates & general discussions",
      isGroup: true,
      memberIds: ["all"],
      createdAt: now,
    },
    {
      id: "management",
      name: "#management",
      description: "Leadership team: Managing Director, GM, HR & Tech Leads",
      isGroup: true,
      memberIds: ["all"],
      createdAt: now,
    },
    {
      id: "tech-and-design",
      name: "#tech-and-design",
      description: "Engineering sprints, UI/UX designs, website builds & tech stack",
      isGroup: true,
      memberIds: ["all"],
      createdAt: now,
    },
    {
      id: "seo-and-growth",
      name: "#seo-and-growth",
      description: "SEO ranking reports, keyword strategies, content audits & campaigns",
      isGroup: true,
      memberIds: ["all"],
      createdAt: now,
    },
    {
      id: "sales-and-telecalling",
      name: "#sales-and-telecalling",
      description: "Client outreach, lead pipelines, telecalling scripts & closures",
      isGroup: true,
      memberIds: ["all"],
      createdAt: now,
    },
  ];
}

export function getDefaultMessages(): ChatMessage[] {
  const now = new Date();
  const dMinus1 = new Date(now.getTime() - 86400000);
  return [
    {
      id: "msg_init_1",
      senderId: "emp_1",
      senderName: "Anand Kumar",
      senderEmpId: "BYT-101",
      senderDesignation: "Managing Director",
      channelId: "general",
      text: "Welcome everyone to B & Y Technologies digital workspace! Please check your attendance and monthly targets.",
      timestamp: dMinus1.toISOString(),
      readBy: ["emp_1", "admin"],
    },
    {
      id: "msg_init_2",
      senderId: "emp_3",
      senderName: "Radhika Menon",
      senderEmpId: "BYT-103",
      senderDesignation: "HR",
      channelId: "general",
      text: "All staff: Monthly attendance calendar and documents are now accessible in Section 2.",
      timestamp: new Date(now.getTime() - 3600000 * 3).toISOString(),
      readBy: ["emp_3", "admin"],
    },
    {
      id: "msg_init_3",
      senderId: "emp_4",
      senderName: "Vikram Raman",
      senderEmpId: "BYT-104",
      senderDesignation: "Tech Team Manager",
      channelId: "tech-and-design",
      text: "New digital marketing client landing pages are deployed and ready for UI/UX audit.",
      timestamp: new Date(now.getTime() - 1800000).toISOString(),
      readBy: ["emp_4"],
    },
  ];
}

function generateSeedData(): DatabaseSchema {
  return {
    admin: {
      name: "admin",
      password: "admin123",
    },
    employees: [],
    attendance: [],
    leaves: [],
    loginLogs: [],
    jobs: [],
    chatMessages: [],
    chatChannels: getDefaultChannels(),
  };
}

let inMemoryDb: DatabaseSchema | null = null;
const TOMBSTONE_PATH = path.join(os.tmpdir(), "by_technologies_deleted_ids.json");
const inMemoryDeletedIds = new Set<string>();

function loadTombstones(): Set<string> {
  try {
    if (fs.existsSync(TOMBSTONE_PATH)) {
      const raw = fs.readFileSync(TOMBSTONE_PATH, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((id: string) => inMemoryDeletedIds.add(id.toLowerCase()));
      }
    }
  } catch (e) {
    // ignore
  }
  return inMemoryDeletedIds;
}

export function recordDeletedId(id: string): void {
  if (!id) return;
  inMemoryDeletedIds.add(id.trim().toLowerCase());
  try {
    fs.writeFileSync(TOMBSTONE_PATH, JSON.stringify(Array.from(inMemoryDeletedIds)), "utf-8");
  } catch (e) {
    // ignore
  }
}

export function unrecordDeletedId(id: string): void {
  if (!id) return;
  const target = id.trim().toLowerCase();
  inMemoryDeletedIds.delete(target);
  try {
    fs.writeFileSync(TOMBSTONE_PATH, JSON.stringify(Array.from(inMemoryDeletedIds)), "utf-8");
  } catch (e) {
    // ignore
  }
}

export function getDeletedIds(): string[] {
  loadTombstones();
  return Array.from(inMemoryDeletedIds);
}

// Vercel Blob Cloud Persistence Helpers
async function loadFromBlob(): Promise<DatabaseSchema | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return null;
  }
  try {
    const { get } = await import("@vercel/blob");
    let res = null;
    try {
      res = await get("hrms_database.json", { access: "private", useCache: false });
    } catch {
      try {
        res = await get("hrms_database.json", { access: "public", useCache: false });
      } catch {}
    }
    if (res && res.statusCode === 200 && res.stream) {
      const text = await new Response(res.stream).text();
      const parsed = JSON.parse(text) as DatabaseSchema;
      return parsed;
    }
  } catch (err) {
    console.warn("[Vercel Blob] Read warning:", err);
  }
  return null;
}

async function saveToBlob(data: DatabaseSchema): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return false;
  }
  try {
    const { put } = await import("@vercel/blob");
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      await put("hrms_database.json", jsonStr, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 0,
      });
      return true;
    } catch {
      await put("hrms_database.json", jsonStr, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 0,
      });
      return true;
    }
  } catch (err) {
    console.error("[Vercel Blob] Write failed:", err);
    return false;
  }
}

export function readDatabase(): DatabaseSchema {
  try {
    const tombstones = loadTombstones();
    const filePath = getDbPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      inMemoryDb = JSON.parse(content);
      if (inMemoryDb && inMemoryDb.employees) {
        inMemoryDb.employees = inMemoryDb.employees.filter(
          (e) => !tombstones.has(e.id.toLowerCase())
        );
      }
      return inMemoryDb!;
    }

    // Fallback: If on Vercel and tmp isn't created yet, check bundled data file
    if (fs.existsSync(DEFAULT_DB_PATH)) {
      const content = fs.readFileSync(DEFAULT_DB_PATH, "utf-8");
      inMemoryDb = JSON.parse(content);
      if (inMemoryDb && inMemoryDb.employees) {
        inMemoryDb.employees = inMemoryDb.employees.filter(
          (e) => !tombstones.has(e.id.toLowerCase())
        );
      }
      try {
        fs.writeFileSync(filePath, JSON.stringify(inMemoryDb, null, 2), "utf-8");
      } catch (e) {
        // ignore
      }
      return inMemoryDb!;
    }

    if (inMemoryDb) return inMemoryDb;
    const seed = generateSeedData();
    inMemoryDb = seed;
    try {
      fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf-8");
    } catch (e) {
      // ignore
    }
    return seed;
  } catch (error) {
    console.error("Error reading database:", error);
    if (inMemoryDb) return inMemoryDb;
    const seed = generateSeedData();
    inMemoryDb = seed;
    return seed;
  }
}

export async function readDatabaseAsync(): Promise<DatabaseSchema> {
  const tombstones = loadTombstones();
  // 1. Try Vercel Blob first
  const blobDb = await loadFromBlob();
  if (blobDb) {
    if (blobDb.employees) {
      blobDb.employees = blobDb.employees.filter(
        (e) => !tombstones.has(e.id.toLowerCase())
      );
    }
    inMemoryDb = blobDb;
    try {
      const filePath = getDbPath();
      fs.writeFileSync(filePath, JSON.stringify(blobDb, null, 2), "utf-8");
    } catch {}
    return inMemoryDb;
  }

  // 2. Read from disk
  const localDb = readDatabase();

  // If Vercel Blob is configured but had no file yet, initialize it
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    saveToBlob(localDb).catch(() => {});
  }

  return localDb;
}

export function writeDatabase(data: DatabaseSchema): void {
  inMemoryDb = data;
  try {
    const filePath = getDbPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write directly to the target file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    // Also persist to DEFAULT_DB_PATH if writable and different
    if (filePath !== DEFAULT_DB_PATH && fs.existsSync(path.dirname(DEFAULT_DB_PATH))) {
      try {
        fs.writeFileSync(DEFAULT_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {
        // Read-only filesystem in Vercel production container
      }
    }
  } catch (error) {
    console.error("Error writing database:", error);
    try {
      const fallbackPath = path.join(os.tmpdir(), "by_technologies_database.json");
      fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err2) {
      console.error("Error writing fallback database:", err2);
    }
  }

  // Background sync to Blob
  saveToBlob(data).catch(() => {});
}

export async function writeDatabaseAsync(data: DatabaseSchema): Promise<void> {
  writeDatabase(data);
  await saveToBlob(data);
}

// Entity helpers

export function getEmployees(): Employee[] {
  const db = readDatabase();
  return db.employees;
}

export async function getEmployeesAsync(): Promise<Employee[]> {
  const db = await readDatabaseAsync();
  return db.employees;
}

export function getEmployeeById(id: string): Employee | undefined {
  const db = readDatabase();
  const target = id.trim().toLowerCase();
  return db.employees.find((e) => e.id.toLowerCase() === target || e.empId.toLowerCase() === target);
}

export async function getEmployeeByIdAsync(id: string): Promise<Employee | undefined> {
  const db = await readDatabaseAsync();
  const target = id.trim().toLowerCase();
  return db.employees.find((e) => e.id.toLowerCase() === target || e.empId.toLowerCase() === target);
}

export function getEmployeeByEmail(email: string): Employee | undefined {
  if (!email) return undefined;
  const db = readDatabase();
  return db.employees.find((e) => e.email && e.email.toLowerCase() === email.toLowerCase());
}

export function getEmployeeByIdentifier(identifier: string): Employee | undefined {
  if (!identifier) return undefined;
  const db = readDatabase();
  const q = identifier.trim().toLowerCase();
  return db.employees.find(
    (e) =>
      e.empId.toLowerCase() === q ||
      e.id.toLowerCase() === q ||
      e.name.toLowerCase() === q ||
      (e.email && e.email.toLowerCase() === q)
  );
}

export function saveEmployee(employee: Employee): Employee {
  unrecordDeletedId(employee.id);
  unrecordDeletedId(employee.empId);
  const db = readDatabase();
  const index = db.employees.findIndex(
    (e) => e.id.toLowerCase() === employee.id.toLowerCase() || e.empId.toLowerCase() === employee.empId.toLowerCase()
  );
  if (index >= 0) {
    db.employees[index] = { ...employee, updatedAt: new Date().toISOString() };
  } else {
    db.employees.push({
      ...employee,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  writeDatabase(db);
  return employee;
}

export async function saveEmployeeAsync(employee: Employee): Promise<Employee> {
  unrecordDeletedId(employee.id);
  unrecordDeletedId(employee.empId);
  const db = await readDatabaseAsync();
  const index = db.employees.findIndex(
    (e) => e.id.toLowerCase() === employee.id.toLowerCase() || e.empId.toLowerCase() === employee.empId.toLowerCase()
  );
  if (index >= 0) {
    db.employees[index] = { ...employee, updatedAt: new Date().toISOString() };
  } else {
    db.employees.push({
      ...employee,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  await writeDatabaseAsync(db);
  return employee;
}

export function deleteEmployee(id: string): boolean {
  const db = readDatabase();
  const initialLen = db.employees.length;
  const target = id.trim().toLowerCase();
  const deletedEmp = db.employees.find(
    (e) => e.id.toLowerCase() === target || e.empId.toLowerCase() === target
  );

  db.employees = db.employees.filter(
    (e) => e.id.toLowerCase() !== target && e.empId.toLowerCase() !== target
  );

  if (db.employees.length !== initialLen) {
    if (deletedEmp) {
      const empIdKey = deletedEmp.id;
      recordDeletedId(empIdKey);
      // Clean up related attendance
      db.attendance = db.attendance.filter(
        (a) => a.employeeId !== empIdKey && a.employeeId !== deletedEmp.empId
      );
      // Clean up related leaves
      db.leaves = db.leaves.filter(
        (l) => l.employeeId !== empIdKey && l.employeeId !== deletedEmp.empId
      );
      // Clean up related login logs
      db.loginLogs = db.loginLogs.filter(
        (lg) => lg.employeeId !== empIdKey && lg.employeeId !== deletedEmp.empId
      );
    }
    writeDatabase(db);
    return true;
  }
  return false;
}

export async function deleteEmployeeAsync(id: string): Promise<boolean> {
  const db = await readDatabaseAsync();
  const initialLen = db.employees.length;
  const target = id.trim().toLowerCase();
  const deletedEmp = db.employees.find(
    (e) => e.id.toLowerCase() === target || e.empId.toLowerCase() === target
  );

  db.employees = db.employees.filter(
    (e) => e.id.toLowerCase() !== target && e.empId.toLowerCase() !== target
  );

  if (db.employees.length !== initialLen) {
    if (deletedEmp) {
      const empIdKey = deletedEmp.id;
      recordDeletedId(empIdKey);
      // Clean up related attendance
      db.attendance = db.attendance.filter(
        (a) => a.employeeId !== empIdKey && a.employeeId !== deletedEmp.empId
      );
      // Clean up related leaves
      db.leaves = db.leaves.filter(
        (l) => l.employeeId !== empIdKey && l.employeeId !== deletedEmp.empId
      );
      // Clean up related login logs
      db.loginLogs = db.loginLogs.filter(
        (lg) => lg.employeeId !== empIdKey && lg.employeeId !== deletedEmp.empId
      );
    }
    await writeDatabaseAsync(db);
    return true;
  }
  return false;
}

export function saveEmployeeVisitingCard(
  employeeId: string,
  cardData: VisitingCardData
): boolean {
  const db = readDatabase();
  const target = employeeId.trim().toLowerCase();
  const empIndex = db.employees.findIndex(
    (e) => e.id.toLowerCase() === target || e.empId.toLowerCase() === target
  );
  if (empIndex >= 0) {
    db.employees[empIndex].visitingCard = {
      ...cardData,
      updatedAt: new Date().toISOString(),
    };
    db.employees[empIndex].updatedAt = new Date().toISOString();
    writeDatabase(db);
    return true;
  }
  return false;
}

export async function saveEmployeeVisitingCardAsync(
  employeeId: string,
  cardData: VisitingCardData
): Promise<boolean> {
  const db = await readDatabaseAsync();
  const target = employeeId.trim().toLowerCase();
  const empIndex = db.employees.findIndex(
    (e) => e.id.toLowerCase() === target || e.empId.toLowerCase() === target
  );
  if (empIndex >= 0) {
    db.employees[empIndex].visitingCard = {
      ...cardData,
      updatedAt: new Date().toISOString(),
    };
    db.employees[empIndex].updatedAt = new Date().toISOString();
    await writeDatabaseAsync(db);
    return true;
  }
  return false;
}

export function getNextEmpId(): string {
  const db = readDatabase();
  const maxNum = db.employees.reduce((max, emp) => {
    const match = emp.empId.match(/BYT-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 100);
  return `BYT-${maxNum + 1}`;
}

export function getAttendance(filters?: {
  date?: string;
  month?: string;
  employeeId?: string;
}): Attendance[] {
  const db = readDatabase();
  let list = db.attendance;
  if (filters?.date) {
    list = list.filter((a) => a.date === filters.date);
  }
  if (filters?.month) {
    const m = filters.month;
    list = list.filter((a) => a.date.startsWith(m));
  }
  if (filters?.employeeId) {
    const empId = filters.employeeId;
    list = list.filter((a) => a.employeeId === empId);
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export function saveAttendance(record: Attendance): Attendance {
  const db = readDatabase();
  const index = db.attendance.findIndex(
    (a) => a.employeeId === record.employeeId && a.date === record.date
  );
  if (index >= 0) {
    db.attendance[index] = {
      ...db.attendance[index],
      ...record,
      updatedAt: new Date().toISOString(),
    };
  } else {
    db.attendance.push({
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  writeDatabase(db);
  return record;
}

export function getLeaves(employeeId?: string): LeaveRequest[] {
  const db = readDatabase();
  let list = db.leaves;
  if (employeeId) {
    list = list.filter((l) => l.employeeId === employeeId);
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveLeave(leave: LeaveRequest): LeaveRequest {
  const db = readDatabase();
  const index = db.leaves.findIndex((l) => l.id === leave.id);
  if (index >= 0) {
    db.leaves[index] = leave;
  } else {
    db.leaves.unshift(leave);
  }
  writeDatabase(db);
  return leave;
}

export function addLoginLog(log: Omit<LoginLog, "id">): LoginLog {
  const db = readDatabase();
  const newLog: LoginLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  db.loginLogs.unshift(newLog);
  // Keep last 500 logs
  if (db.loginLogs.length > 500) {
    db.loginLogs = db.loginLogs.slice(0, 500);
  }
  writeDatabase(db);
  return newLog;
}

export function getLoginLogs(limit = 100): LoginLog[] {
  const db = readDatabase();
  return db.loginLogs.slice(0, limit);
}

export function clearLoginLogs(): void {
  const db = readDatabase();
  db.loginLogs = [];
  writeDatabase(db);
}

export function deleteLoginLog(id: string): boolean {
  const db = readDatabase();
  const initialLen = db.loginLogs.length;
  db.loginLogs = db.loginLogs.filter((l) => l.id !== id);
  if (db.loginLogs.length !== initialLen) {
    writeDatabase(db);
    return true;
  }
  return false;
}

export function getJobs(): JobOpening[] {
  const db = readDatabase();
  return db.jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveJob(job: JobOpening): JobOpening {
  const db = readDatabase();
  const index = db.jobs.findIndex((j) => j.id === job.id);
  if (index >= 0) {
    db.jobs[index] = { ...job, updatedAt: new Date().toISOString() };
  } else {
    db.jobs.unshift({
      ...job,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  writeDatabase(db);
  return job;
}

export function deleteJob(id: string): boolean {
  const db = readDatabase();
  const initialLen = db.jobs.length;
  db.jobs = db.jobs.filter((j) => j.id !== id);
  if (db.jobs.length !== initialLen) {
    writeDatabase(db);
    return true;
  }
  return false;
}

// ==========================================
// CHAT & TEAM CONNECT
// ==========================================

export function getChatChannels(): ChatChannel[] {
  const db = readDatabase();
  return db.chatChannels || getDefaultChannels();
}

export function saveChatChannel(channel: ChatChannel): ChatChannel {
  const db = readDatabase();
  if (!db.chatChannels) db.chatChannels = getDefaultChannels();
  const idx = db.chatChannels.findIndex((c) => c.id === channel.id);
  if (idx >= 0) {
    db.chatChannels[idx] = channel;
  } else {
    db.chatChannels.push(channel);
  }
  writeDatabase(db);
  return channel;
}

export function getChatMessages(filter?: {
  channelId?: string;
  dmUser1?: string;
  dmUser2?: string;
}): ChatMessage[] {
  const db = readDatabase();
  const allMessages = db.chatMessages || getDefaultMessages();

  if (filter?.channelId) {
    return allMessages
      .filter((m) => m.channelId === filter.channelId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  if (filter?.dmUser1 && filter?.dmUser2) {
    const u1 = filter.dmUser1;
    const u2 = filter.dmUser2;
    return allMessages
      .filter(
        (m) =>
          !m.channelId &&
          ((m.senderId === u1 && m.recipientId === u2) ||
            (m.senderId === u2 && m.recipientId === u1))
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  return allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function saveChatMessage(
  msg: Omit<ChatMessage, "id" | "timestamp" | "readBy"> & {
    id?: string;
    timestamp?: string;
    readBy?: string[];
  }
): ChatMessage {
  const db = readDatabase();
  if (!db.chatMessages) db.chatMessages = getDefaultMessages();

  const newMsg: ChatMessage = {
    ...msg,
    id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: msg.timestamp || new Date().toISOString(),
    readBy: msg.readBy || [msg.senderId],
  };

  db.chatMessages.push(newMsg);
  // Keep last 2000 messages
  if (db.chatMessages.length > 2000) {
    db.chatMessages = db.chatMessages.slice(db.chatMessages.length - 2000);
  }
  writeDatabase(db);
  return newMsg;
}

export function markMessagesAsRead(
  userId: string,
  target: { channelId?: string; dmSenderId?: string }
): boolean {
  const db = readDatabase();
  if (!db.chatMessages) return false;

  let modified = false;
  db.chatMessages.forEach((m) => {
    if (target.channelId && m.channelId === target.channelId) {
      if (!m.readBy.includes(userId)) {
        m.readBy.push(userId);
        modified = true;
      }
    } else if (
      target.dmSenderId &&
      !m.channelId &&
      m.senderId === target.dmSenderId &&
      m.recipientId === userId
    ) {
      if (!m.readBy.includes(userId)) {
        m.readBy.push(userId);
        modified = true;
      }
    }
  });

  if (modified) {
    writeDatabase(db);
  }
  return modified;
}

export function getUnreadChatCount(userId: string): {
  total: number;
  channels: Record<string, number>;
  dms: Record<string, number>;
} {
  const db = readDatabase();
  const allMessages = db.chatMessages || [];

  const channels: Record<string, number> = {};
  const dms: Record<string, number> = {};
  let total = 0;

  allMessages.forEach((m) => {
    if (m.senderId === userId) return;

    const isUnread = !m.readBy.includes(userId);
    if (!isUnread) return;

    if (m.channelId) {
      channels[m.channelId] = (channels[m.channelId] || 0) + 1;
      total++;
    } else if (m.recipientId === userId) {
      dms[m.senderId] = (dms[m.senderId] || 0) + 1;
      total++;
    }
  });

  return { total, channels, dms };
}

