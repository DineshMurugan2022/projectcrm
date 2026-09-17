// Pure utilities & types for B&Y Technologies Offer Letter & Workspace
// Safe to import in both Client ('use client') and Server components

export interface OfferLetterData {
  candidateName: string;
  empId: string;
  designation: string;
  dob?: string;
  addressLine1?: string;
  addressLine2?: string;
  cityStatePin?: string;
  dateOfJoining?: string;
  offerDate?: string;
  annualSalary: number;
  annualSalaryWords?: string;
  monthlySalary?: number;
  signatoryName?: string;
  signatoryTitle?: string;
  workTimings?: string;
  salutationPrefix?: string;
}

export interface WorkspaceFileMetadata {
  fileName: string;
  category: "excel" | "word";
  docType: "master_roster" | "appointment_letter" | "offer_letter" | "employee_dossier" | "nda_agreement";
  employeeName?: string;
  empId?: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  relativePath: string;
  downloadUrl: string;
}

export function formatIndianCurrency(num: number): string {
  return Math.round(num || 0).toLocaleString("en-IN");
}

export function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "Rupees Zero Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertLessThanOneThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "") + " ";
    } else if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let rem = num;

  let result = "";
  if (crore > 0) result += convertLessThanOneThousand(crore) + " Crore ";
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + " Thousand ";
  if (rem > 0) result += convertLessThanOneThousand(rem) + " ";

  const trimmed = result.trim();
  return trimmed ? `Rupees ${trimmed} Only` : "Rupees Zero Only";
}

export function getDefaultSalaryForDesignation(designation: string): { annual: number; monthly: number } {
  const d = (designation || "").toLowerCase();
  if (d.includes("managing director") || d.includes("general manager")) {
    return { annual: 600000, monthly: 50000 };
  }
  if (d.includes("tech team manager")) {
    return { annual: 480000, monthly: 40000 };
  }
  if (d.includes("sr bdm")) {
    return { annual: 360000, monthly: 30000 };
  }
  if (d.includes("bdm")) {
    return { annual: 300000, monthly: 25000 };
  }
  if (d.includes("bde")) {
    return { annual: 276000, monthly: 23000 };
  }
  if (d.includes("sr seo")) {
    return { annual: 240000, monthly: 20000 };
  }
  if (d.includes("seo")) {
    return { annual: 180000, monthly: 15000 };
  }
  if (d.includes("graphic designer") || d.includes("graphic")) {
    return { annual: 192000, monthly: 16000 };
  }
  if (d.includes("process associate")) {
    return { annual: 180000, monthly: 15000 };
  }
  if (d.includes("team leader")) {
    return { annual: 216000, monthly: 18000 };
  }
  if (d.includes("fullstack") || d.includes("full stack")) {
    return { annual: 120000, monthly: 10000 };
  }
  if (d.includes("ui/ux") || d.includes("ui ux") || d.includes("ui")) {
    return { annual: 120000, monthly: 10000 };
  }
  if (d.includes("customer support") || d.includes("telecaller")) {
    return { annual: 144000, monthly: 12000 };
  }
  if (d.includes("hr")) {
    return { annual: 240000, monthly: 20000 };
  }
  return { annual: 180000, monthly: 15000 };
}

export function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatLongDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
    }
  } catch (e) {}
  return dateStr;
}

export function formatSlashDate(dateStr?: string): string {
  if (!dateStr) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  if (dateStr.includes("/")) return dateStr;
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
}
