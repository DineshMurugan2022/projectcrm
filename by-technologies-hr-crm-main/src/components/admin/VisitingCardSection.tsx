"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Download,
  Printer,
  Save,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  User,
  Briefcase,
  Phone,
  Mail,
  Globe,
  MapPin,
  Sparkles,
  Copy,
  Check,
  Edit3,
  Trash2,
  Zap,
  FileText,
  Sliders,
  Move,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  Employee,
  VisitingCardData,
  CardLayoutSettings,
  ElementLayout,
} from "@/lib/types";

interface VisitingCardSectionProps {
  initialEmployee?: Employee | null;
  onBackToRecords?: () => void;
}

export const DEFAULT_CARD_LAYOUT: CardLayoutSettings = {
  name: {
    x: 20.5, // 420 on 2048 (aligned right after laptop icon)
    y: 19.0, // 195 on 1024 (vertically centered in dark olive ribbon)
    fontSize: 76,
    textAlign: "left",
  },
  designation: {
    x: 20.5, // 420 on 2048
    y: 26.8, // 275 on 1024 (centered in green ribbon below name)
    fontSize: 40,
    textAlign: "left",
  },
  phone: {
    x: 11.2, // 230 on 2048 (aligned with phone icon)
    y: 51.5, // 527 on 1024
    fontSize: 44,
    textAlign: "left",
  },
  email: {
    x: 11.2, // 230 on 2048 (aligned with email envelope icon)
    y: 62.8, // 643 on 1024
    fontSize: 40,
    textAlign: "left",
  },
  website: {
    x: 11.2, // 230 on 2048 (aligned with world globe icon)
    y: 74.2, // 760 on 1024
    fontSize: 40,
    textAlign: "left",
  },
  address: {
    x: 11.2, // 230 on 2048 (aligned with location pin icon)
    y: 86.5, // 886 on 1024
    fontSize: 32,
    textAlign: "left",
  },
};

const DEFAULT_CARD_DATA: VisitingCardData = {
  name: "Imran",
  designation: "Business Development Manager",
  phone: "+91 7824878137",
  email: "info@bnytechnologies.com",
  website: "www.bnytechnologies.com",
  address: "No.624, Khivraj Building, 3rdFloor,\nAnna Salai, Chennai - 600006.",
  layout: DEFAULT_CARD_LAYOUT,
};

type FieldKey = "name" | "designation" | "phone" | "email" | "website" | "address";

interface FieldMeta {
  key: FieldKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minFontSize: number;
  maxFontSize: number;
  color: string;
  defaultAlign: "left" | "center" | "right";
  description: string;
}

const FIELD_METAS: FieldMeta[] = [
  {
    key: "name",
    label: "Employee Name",
    icon: User,
    minFontSize: 24,
    maxFontSize: 130,
    color: "#FFFFFF",
    defaultAlign: "left",
    description: "Top dark olive ribbon (Bold White)",
  },
  {
    key: "designation",
    label: "Job Designation",
    icon: Briefcase,
    minFontSize: 16,
    maxFontSize: 80,
    color: "#1b2817",
    defaultAlign: "left",
    description: "Light olive ribbon under name (Dark Green)",
  },
  {
    key: "phone",
    label: "Phone Number",
    icon: Phone,
    minFontSize: 16,
    maxFontSize: 80,
    color: "#FFFFFF",
    defaultAlign: "left",
    description: "Next to telephone icon",
  },
  {
    key: "email",
    label: "Email Address",
    icon: Mail,
    minFontSize: 16,
    maxFontSize: 80,
    color: "#FFFFFF",
    defaultAlign: "left",
    description: "Next to email envelope icon",
  },
  {
    key: "website",
    label: "Website URL",
    icon: Globe,
    minFontSize: 16,
    maxFontSize: 80,
    color: "#FFFFFF",
    defaultAlign: "left",
    description: "Next to world globe icon",
  },
  {
    key: "address",
    label: "Office Address",
    icon: MapPin,
    minFontSize: 14,
    maxFontSize: 60,
    color: "#FFFFFF",
    defaultAlign: "left",
    description: "Next to location pin (2 lines)",
  },
];

// Helper to split address into 2 lines
export const splitAddress = (addr: string): [string, string] => {
  if (!addr) return ["", ""];
  if (addr.includes("\n")) {
    const parts = addr.split("\n");
    return [parts[0].trim(), parts.slice(1).join(" ").trim()];
  }
  const commaIdx = addr.indexOf(",");
  if (commaIdx !== -1 && addr.length > 30) {
    const secondComma = addr.indexOf(",", commaIdx + 1);
    const splitPoint = secondComma !== -1 ? secondComma + 1 : commaIdx + 1;
    return [addr.substring(0, splitPoint).trim(), addr.substring(splitPoint).trim()];
  }
  return [addr, ""];
};

// Reusable master canvas renderer for 100% WYSIWYG matching between preview & downloads
export const drawCardToCanvas = (
  canvas: HTMLCanvasElement,
  data: VisitingCardData,
  img: HTMLImageElement,
  excludeField?: string | null
) => {
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, 2048, 1024);

  const layout = data.layout || DEFAULT_CARD_LAYOUT;
  ctx.textBaseline = "middle";

  // A. Employee Name
  if (excludeField !== "name") {
    const nameCfg = layout.name || DEFAULT_CARD_LAYOUT.name;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = nameCfg.textAlign || "left";
    ctx.font = `bold ${nameCfg.fontSize}px Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(
      data.name || "Employee Name",
      (nameCfg.x / 100) * 2048,
      (nameCfg.y / 100) * 1024
    );
  }

  // B. Job Designation
  if (excludeField !== "designation") {
    const desigCfg = layout.designation || DEFAULT_CARD_LAYOUT.designation;
    ctx.fillStyle = "#1b2817";
    ctx.textAlign = desigCfg.textAlign || "left";
    ctx.font = `bold ${desigCfg.fontSize}px Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(
      data.designation || "Job Designation",
      (desigCfg.x / 100) * 2048,
      (desigCfg.y / 100) * 1024
    );
  }

  // C. Phone Number
  if (excludeField !== "phone") {
    const phoneCfg = layout.phone || DEFAULT_CARD_LAYOUT.phone;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = phoneCfg.textAlign || "left";
    ctx.font = `bold ${phoneCfg.fontSize}px Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(
      data.phone || "+91 7824878137",
      (phoneCfg.x / 100) * 2048,
      (phoneCfg.y / 100) * 1024
    );
  }

  // D. Email Address
  if (excludeField !== "email") {
    const emailCfg = layout.email || DEFAULT_CARD_LAYOUT.email;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = emailCfg.textAlign || "left";
    ctx.font = `bold ${emailCfg.fontSize}px Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(
      data.email || "info@bnytechnologies.com",
      (emailCfg.x / 100) * 2048,
      (emailCfg.y / 100) * 1024
    );
  }

  // E. Website URL
  if (excludeField !== "website") {
    const webCfg = layout.website || DEFAULT_CARD_LAYOUT.website;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = webCfg.textAlign || "left";
    ctx.font = `bold ${webCfg.fontSize}px Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(
      data.website || "www.bnytechnologies.com",
      (webCfg.x / 100) * 2048,
      (webCfg.y / 100) * 1024
    );
  }

  // F. Office Address (supports 2 lines with proper spacing)
  if (excludeField !== "address") {
    const addrCfg = layout.address || DEFAULT_CARD_LAYOUT.address;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = addrCfg.textAlign || "left";
    ctx.font = `bold ${addrCfg.fontSize}px Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif`;
    const [line1, line2] = splitAddress(data.address);
    const addrX = (addrCfg.x / 100) * 2048;
    const addrY = (addrCfg.y / 100) * 1024;
    const lineSpacing = addrCfg.fontSize * 1.25;
    if (line2) {
      ctx.fillText(line1, addrX, addrY - lineSpacing / 2);
      ctx.fillText(line2, addrX, addrY + lineSpacing / 2);
    } else {
      ctx.fillText(line1 || data.address || "", addrX, addrY);
    }
  }
};

// Automatically upgrades legacy stored layouts with tiny font sizes to calibrated master proportions
export const upgradeLegacyLayout = (layout?: Partial<CardLayoutSettings> | null): CardLayoutSettings => {
  if (!layout) return JSON.parse(JSON.stringify(DEFAULT_CARD_LAYOUT));

  return {
    name: {
      ...DEFAULT_CARD_LAYOUT.name,
      ...(layout.name || {}),
      fontSize: Math.max(layout.name?.fontSize || 0, DEFAULT_CARD_LAYOUT.name.fontSize),
    },
    designation: {
      ...DEFAULT_CARD_LAYOUT.designation,
      ...(layout.designation || {}),
      fontSize: Math.max(layout.designation?.fontSize || 0, DEFAULT_CARD_LAYOUT.designation.fontSize),
    },
    phone: {
      ...DEFAULT_CARD_LAYOUT.phone,
      ...(layout.phone || {}),
      fontSize: Math.max(layout.phone?.fontSize || 0, DEFAULT_CARD_LAYOUT.phone.fontSize),
    },
    email: {
      ...DEFAULT_CARD_LAYOUT.email,
      ...(layout.email || {}),
      fontSize: Math.max(layout.email?.fontSize || 0, DEFAULT_CARD_LAYOUT.email.fontSize),
    },
    website: {
      ...DEFAULT_CARD_LAYOUT.website,
      ...(layout.website || {}),
      fontSize: Math.max(layout.website?.fontSize || 0, DEFAULT_CARD_LAYOUT.website.fontSize),
    },
    address: {
      ...DEFAULT_CARD_LAYOUT.address,
      ...(layout.address || {}),
      fontSize: Math.max(layout.address?.fontSize || 0, DEFAULT_CARD_LAYOUT.address.fontSize),
    },
  };
};

export default function VisitingCardSection({
  initialEmployee,
  onBackToRecords,
}: VisitingCardSectionProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployee?.id || ""
  );
  const [cardData, setCardData] = useState<VisitingCardData>(() => {
    let initialLayout = DEFAULT_CARD_LAYOUT;
    if (initialEmployee) {
      try {
        const stored = localStorage.getItem(`byt_card_layout_${initialEmployee.id}`);
        if (stored) {
          initialLayout = upgradeLegacyLayout({ ...DEFAULT_CARD_LAYOUT, ...JSON.parse(stored) });
        } else if (initialEmployee.visitingCard?.layout) {
          initialLayout = upgradeLegacyLayout({ ...DEFAULT_CARD_LAYOUT, ...initialEmployee.visitingCard.layout });
        }
      } catch {}
    }
    return {
      ...DEFAULT_CARD_DATA,
      layout: JSON.parse(JSON.stringify(initialLayout)),
    };
  });

  // Tab & Slider state
  const [activeTab, setActiveTab] = useState<"text" | "sliders">("text");
  const [selectedField, setSelectedField] = useState<FieldKey>("name");

  const [isGeneratedModalOpen, setIsGeneratedModalOpen] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFieldFocus, setActiveFieldFocus] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const templateImageRef = useRef<HTMLImageElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(672);
  const [isTemplateLoaded, setIsTemplateLoaded] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Preload master blank template image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/visiting-card-blank.png";
    img.onload = () => {
      templateImageRef.current = img;
      setIsTemplateLoaded(true);
      if (previewCanvasRef.current) {
        drawCardToCanvas(previewCanvasRef.current, cardData, img);
      }
    };
  }, []);

  // Measure card preview container width dynamically for 100% pixel-perfect font scaling
  useEffect(() => {
    if (!cardContainerRef.current) return;
    const el = cardContainerRef.current;
    const updateSize = () => {
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0) {
          setContainerWidth(rect.width);
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Whenever cardData changes, template loads, or active field focus changes, re-render the preview canvas
  useEffect(() => {
    if (templateImageRef.current && previewCanvasRef.current) {
      drawCardToCanvas(
        previewCanvasRef.current,
        cardData,
        templateImageRef.current,
        activeFieldFocus
      );
    }
  }, [cardData, isTemplateLoaded, activeFieldFocus]);

  // Load employees list on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const data = await res.json();
        if (data.success) {
          let list: Employee[] = data.employees;
          try {
            const raw = localStorage.getItem("byt_deleted_emp_ids");
            if (raw) {
              const deletedIds: string[] = JSON.parse(raw);
              list = list.filter(
                (e) => !deletedIds.includes(e.id) && !deletedIds.includes(e.empId)
              );
            }
          } catch (e) {
            // ignore
          }
          setEmployees(list);

          // If an initial employee was passed, use it
          if (initialEmployee) {
            setSelectedEmpId(initialEmployee.id);
            loadEmployeeToCard(initialEmployee);
          } else if (list.length > 0 && !selectedEmpId) {
            const first = list[0];
            setSelectedEmpId(first.id);
            loadEmployeeToCard(first);
          }
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };
    fetchEmployees();
  }, [initialEmployee]);

  const loadEmployeeToCard = (emp: Employee) => {
    let savedLayout = DEFAULT_CARD_LAYOUT;
    try {
      const stored = localStorage.getItem(`byt_card_layout_${emp.id}`);
      if (stored) {
        savedLayout = upgradeLegacyLayout({ ...DEFAULT_CARD_LAYOUT, ...JSON.parse(stored) });
      } else if (emp.visitingCard?.layout) {
        savedLayout = upgradeLegacyLayout({ ...DEFAULT_CARD_LAYOUT, ...emp.visitingCard.layout });
      }
    } catch {
      // ignore
    }

    if (emp.visitingCard) {
      setCardData({
        ...emp.visitingCard,
        layout: savedLayout,
      });
    } else {
      setCardData({
        name: emp.name || "",
        designation: emp.designation || "",
        phone: emp.phone || "+91 7824878137",
        email: emp.email || "info@bnytechnologies.com",
        website: "www.bnytechnologies.com",
        address: "No.624, Khivraj Building, 3rdFloor,\nAnna Salai, Chennai - 600006.",
        layout: savedLayout,
      });
    }
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => e.id === empId || e.empId === empId);
    if (emp) {
      loadEmployeeToCard(emp);
      showToast(`Populated details for ${emp.name}`);
    }
  };

  const handleResetToDefaults = () => {
    setCardData({
      ...DEFAULT_CARD_DATA,
      layout: JSON.parse(JSON.stringify(DEFAULT_CARD_LAYOUT)),
    });
    if (selectedEmpId) {
      try {
        localStorage.removeItem(`byt_card_layout_${selectedEmpId}`);
      } catch {}
    }
    showToast("Reset to master template example words and calibrated layout (Imran)");
  };

  const handleClearWords = () => {
    setCardData((prev) => ({
      ...prev,
      name: "",
      designation: "",
      phone: "",
      email: "",
      website: "",
      address: "",
    }));
    showToast("Cleared all card words. Type employee details now.");
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Layout Slider & Nudge Handlers
  const currentLayout = cardData.layout || DEFAULT_CARD_LAYOUT;
  const activeFieldLayout = currentLayout[selectedField] || DEFAULT_CARD_LAYOUT[selectedField];

  const updateFieldLayout = (field: FieldKey, updates: Partial<ElementLayout>) => {
    setCardData((prev) => {
      const l = prev.layout || DEFAULT_CARD_LAYOUT;
      const target = l[field] || DEFAULT_CARD_LAYOUT[field];
      const updated = {
        ...l,
        [field]: {
          ...target,
          ...updates,
        },
      };
      if (selectedEmpId) {
        try {
          localStorage.setItem(`byt_card_layout_${selectedEmpId}`, JSON.stringify(updated));
        } catch {}
      }
      return { ...prev, layout: updated };
    });
  };

  const nudgeField = (field: FieldKey, deltaX: number, deltaY: number) => {
    const current = (cardData.layout || DEFAULT_CARD_LAYOUT)[field];
    updateFieldLayout(field, {
      x: Math.max(0, Math.min(100, parseFloat((current.x + deltaX).toFixed(1)))),
      y: Math.max(0, Math.min(100, parseFloat((current.y + deltaY).toFixed(1)))),
    });
  };

  const nudgeFontSize = (field: FieldKey, delta: number) => {
    const current = (cardData.layout || DEFAULT_CARD_LAYOUT)[field];
    const meta = FIELD_METAS.find((m) => m.key === field);
    const min = meta?.minFontSize || 10;
    const max = meta?.maxFontSize || 140;
    updateFieldLayout(field, {
      fontSize: Math.max(min, Math.min(max, current.fontSize + delta)),
    });
  };

  const resetFieldLayout = (field: FieldKey) => {
    updateFieldLayout(field, { ...DEFAULT_CARD_LAYOUT[field] });
    showToast(`Reset ${field} position and size to default`);
  };

  const resetAllLayouts = () => {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_CARD_LAYOUT));
    setCardData((prev) => ({
      ...prev,
      layout: fresh,
    }));
    if (selectedEmpId) {
      try {
        localStorage.removeItem(`byt_card_layout_${selectedEmpId}`);
      } catch {}
    }
    showToast("Reset all text box positions and sizes to master defaults");
  };

  // Nudge all 4 contact items together
  const nudgeContactGroup = (deltaX: number, deltaY: number) => {
    const contactKeys: FieldKey[] = ["phone", "email", "website", "address"];
    setCardData((prev) => {
      const l = prev.layout || DEFAULT_CARD_LAYOUT;
      const updated = { ...l };
      contactKeys.forEach((key) => {
        const item = updated[key];
        updated[key] = {
          ...item,
          x: Math.max(0, Math.min(100, parseFloat((item.x + deltaX).toFixed(1)))),
          y: Math.max(0, Math.min(100, parseFloat((item.y + deltaY).toFixed(1)))),
        };
      });
      return { ...prev, layout: updated };
    });
  };

  // High-Resolution 2048x1024 Canvas Render with Exact Slider Positions
  const renderCardCanvas = async (): Promise<string> => {
    if (previewCanvasRef.current && templateImageRef.current) {
      drawCardToCanvas(previewCanvasRef.current, cardData, templateImageRef.current);
      return previewCanvasRef.current.toDataURL("image/png");
    }
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current || document.createElement("canvas");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/visiting-card-blank.png";
      img.onload = () => {
        drawCardToCanvas(canvas, cardData, img);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    });
  };

  // Primary action: GENERATE & OPEN PREVIEW MODAL
  const handleGenerateCard = async () => {
    try {
      setIsGenerating(true);
      const dataUrl = await renderCardCanvas();
      setGeneratedImageUrl(dataUrl);
      setIsGeneratedModalOpen(true);
      showToast("Visiting card generated successfully at 2048 × 1024 master resolution!");
    } catch (err) {
      console.error("Card generation failed:", err);
      showToast("Failed to generate visiting card image.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download High-Resolution PNG (2048x1024)
  const handleDownloadPng = async () => {
    try {
      const dataUrl = generatedImageUrl || (await renderCardCanvas());
      const link = document.createElement("a");
      const safeName = (cardData.name || "Employee").replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `B_and_Y_Technologies_Visiting_Card_${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Visiting card downloaded as high-quality PNG!");
    } catch (err) {
      console.error("Download PNG error:", err);
      showToast("Failed to download PNG.");
    }
  };

  // Download Print-Ready PDF (standard 3.5" x 2" business card)
  const handleDownloadPdf = async () => {
    try {
      const dataUrl = generatedImageUrl || (await renderCardCanvas());
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [3.5, 2.0],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, 3.5, 2.0);
      const safeName = (cardData.name || "Employee").replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`B_and_Y_Technologies_Visiting_Card_${safeName}.pdf`);
      showToast("Visiting card downloaded as print-ready PDF (3.5 × 2 in)!");
    } catch (err) {
      console.error("Download PDF error:", err);
      showToast("Failed to generate PDF.");
    }
  };

  // Copy high-res image to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        showToast("Canvas not available");
        return;
      }
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopied(true);
          showToast("Visiting card image copied to clipboard!");
          setTimeout(() => setCopied(false), 3000);
        } else {
          showToast("Clipboard image copy not supported on this browser.");
        }
      });
    } catch (err) {
      console.error("Clipboard copy error:", err);
      showToast("Failed to copy image to clipboard.");
    }
  };

  // Print card with standard 3.5" x 2" sizing
  const handlePrint = async () => {
    try {
      const dataUrl = generatedImageUrl || (await renderCardCanvas());
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to print the visiting card.");
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Visiting Card - ${cardData.name}</title>
            <style>
              @page {
                size: 3.5in 2in;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background-color: #f0f0f0;
              }
              img {
                width: 3.5in;
                height: 2in;
                object-fit: contain;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              }
              @media print {
                body {
                  background: none;
                  height: auto;
                }
                img {
                  width: 3.5in;
                  height: 2in;
                  box-shadow: none;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Visiting Card" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Print error:", err);
      showToast("Failed to prepare card for printing");
    }
  };

  // Save card customizations to database
  const handleSaveCard = async () => {
    if (!selectedEmpId) {
      showToast("Please select an employee first");
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch("/api/visiting-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          cardData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.setItem(
            `byt_card_${selectedEmpId}`,
            JSON.stringify(cardData)
          );
          if (cardData.layout) {
            localStorage.setItem(
              `byt_card_layout_${selectedEmpId}`,
              JSON.stringify(cardData.layout)
            );
          }
        } catch (e) {
          // ignore
        }
        showToast(`Visiting card saved permanently for ${cardData.name}!`);
      } else {
        showToast(data.error || "Failed to save card");
      }
    } catch (err) {
      console.error("Save card error:", err);
      showToast("Network error while saving visiting card");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedMeta = FIELD_METAS.find((m) => m.key === selectedField) || FIELD_METAS[0];
  const [addrLine1, addrLine2] = splitAddress(cardData.address);
  const layout = cardData.layout || DEFAULT_CARD_LAYOUT;
  const scale = (containerWidth || 672) / 2048;

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#162E3D] text-[#45C512] font-semibold text-xs rounded-xl shadow-2xl border border-[#45C512]/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#45C512] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden Canvas for High-DPI Generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Studio Header */}
      <div className="bg-white rounded-2xl border border-[#DDEAE2] p-6 shadow-by">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#162E3D] text-[#45C512] flex items-center justify-center font-bold shadow-sm">
                <CreditCard className="w-6 h-6 text-[#45C512]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#162E3D]">
                    Official Visiting Card Generator
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#45C512]/20 text-[#162E3D] border border-[#45C512]/40">
                    MASTER TEMPLATE &bull; ADJUSTABLE TEXT &amp; SLIDERS
                  </span>
                </div>
                <p className="text-xs text-[#5B7586] mt-0.5">
                  Template graphics are locked to brand fidelity. Use the sliders to position, size, and fine-tune every text box with pixel accuracy.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onBackToRecords && (
              <button
                onClick={onBackToRecords}
                className="px-3.5 py-2 text-xs font-semibold text-[#162E3D] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-xl transition-colors cursor-pointer border border-[#DDEAE2]"
              >
                &larr; Back to Employees
              </button>
            )}

            <button
              onClick={handleSaveCard}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save to Employee"}</span>
            </button>

            {/* PREVIEW BUTTON */}
            <button
              onClick={handleGenerateCard}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 ring-2 ring-[#45C512]/50"
            >
              <Zap className="w-4 h-4 fill-current text-[#162E3D]" />
              <span>{isGenerating ? "Generating..." : "PREVIEW & GENERATE CARD"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Two Modes - Text Input vs. Position & Size Sliders */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DDEAE2] p-6 shadow-by space-y-5">
          {/* Studio Mode Selector (Tabs) */}
          <div className="flex items-center p-1 bg-[#F5F9F7] rounded-xl border border-[#DDEAE2]">
            <button
              onClick={() => setActiveTab("text")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "text"
                  ? "bg-white text-[#162E3D] shadow-sm border border-[#DDEAE2]"
                  : "text-[#5B7586] hover:text-[#162E3D]"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-[#45C512]" />
              <span>1. Edit Text Words</span>
            </button>
            <button
              onClick={() => setActiveTab("sliders")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "sliders"
                  ? "bg-[#162E3D] text-[#45C512] shadow-sm"
                  : "text-[#5B7586] hover:text-[#162E3D]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#45C512]" />
              <span>2. Position &amp; Size Sliders</span>
            </button>
          </div>

          {/* Quick Employee Selector */}
          <div>
            <label className="block text-xs font-bold text-[#162E3D] mb-1">
              Select Employee to Auto-Populate
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-medium"
            >
              <option value="">-- Choose Employee to Populate --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.empId} &bull; {emp.name} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          {/* TAB 1: EDIT TEXT WORDS */}
          {activeTab === "text" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDEAE2]">
                <div>
                  <h2 className="text-sm font-bold text-[#162E3D] flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#45C512]" />
                    Editable Card Content
                  </h2>
                  <p className="text-[11px] text-[#5B7586]">
                    Modify the text values. Switch to Sliders tab to adjust layout.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearWords}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                    title="Clear all text fields to enter new details"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                  <button
                    onClick={handleResetToDefaults}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#162E3D] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-lg transition-colors cursor-pointer border border-[#DDEAE2]"
                    title="Reset to original uploaded card words (Imran)"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sample Words</span>
                  </button>
                </div>
              </div>

              {/* Field 1: Employee Name */}
              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#45C512]" />
                    1. Employee Name *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedField("name");
                      setActiveTab("sliders");
                    }}
                    className="text-[10px] text-[#45C512] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sliders className="w-2.5 h-2.5" /> Adjust sliders
                  </button>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={cardData.name}
                  onFocus={() => setActiveFieldFocus("name")}
                  onBlur={() => setActiveFieldFocus(null)}
                  onChange={(e) =>
                    setCardData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Imran"
                  className={`w-full px-3 py-2 text-xs bg-[#F5F9F7] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-bold transition-all ${
                    activeFieldFocus === "name"
                      ? "border-[#45C512] bg-white ring-2 ring-[#45C512]/30"
                      : "border-[#DDEAE2]"
                  }`}
                />
              </div>

              {/* Field 2: Designation */}
              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#45C512]" />
                    2. Job Designation *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedField("designation");
                      setActiveTab("sliders");
                    }}
                    className="text-[10px] text-[#45C512] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sliders className="w-2.5 h-2.5" /> Adjust sliders
                  </button>
                </label>
                <input
                  type="text"
                  value={cardData.designation}
                  onFocus={() => setActiveFieldFocus("designation")}
                  onBlur={() => setActiveFieldFocus(null)}
                  onChange={(e) =>
                    setCardData((prev) => ({ ...prev, designation: e.target.value }))
                  }
                  placeholder="e.g. Business Development Manager"
                  className={`w-full px-3 py-2 text-xs bg-[#F5F9F7] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] transition-all ${
                    activeFieldFocus === "designation"
                      ? "border-[#45C512] bg-white ring-2 ring-[#45C512]/30"
                      : "border-[#DDEAE2]"
                  }`}
                />
              </div>

              {/* Field 3: Phone */}
              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#45C512]" />
                    3. Phone Number *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedField("phone");
                      setActiveTab("sliders");
                    }}
                    className="text-[10px] text-[#45C512] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sliders className="w-2.5 h-2.5" /> Adjust sliders
                  </button>
                </label>
                <input
                  type="text"
                  value={cardData.phone}
                  onFocus={() => setActiveFieldFocus("phone")}
                  onBlur={() => setActiveFieldFocus(null)}
                  onChange={(e) =>
                    setCardData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g. +91 7824878137"
                  className={`w-full px-3 py-2 text-xs bg-[#F5F9F7] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] font-mono font-bold transition-all ${
                    activeFieldFocus === "phone"
                      ? "border-[#45C512] bg-white ring-2 ring-[#45C512]/30"
                      : "border-[#DDEAE2]"
                  }`}
                />
              </div>

              {/* Field 4: Email */}
              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#45C512]" />
                    4. Email Address *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedField("email");
                      setActiveTab("sliders");
                    }}
                    className="text-[10px] text-[#45C512] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sliders className="w-2.5 h-2.5" /> Adjust sliders
                  </button>
                </label>
                <input
                  type="email"
                  value={cardData.email}
                  onFocus={() => setActiveFieldFocus("email")}
                  onBlur={() => setActiveFieldFocus(null)}
                  onChange={(e) =>
                    setCardData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="e.g. info@bnytechnologies.com"
                  className={`w-full px-3 py-2 text-xs bg-[#F5F9F7] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] transition-all ${
                    activeFieldFocus === "email"
                      ? "border-[#45C512] bg-white ring-2 ring-[#45C512]/30"
                      : "border-[#DDEAE2]"
                  }`}
                />
              </div>

              {/* Field 5: Website */}
              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#45C512]" />
                    5. Website URL *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedField("website");
                      setActiveTab("sliders");
                    }}
                    className="text-[10px] text-[#45C512] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sliders className="w-2.5 h-2.5" /> Adjust sliders
                  </button>
                </label>
                <input
                  type="text"
                  value={cardData.website}
                  onFocus={() => setActiveFieldFocus("website")}
                  onBlur={() => setActiveFieldFocus(null)}
                  onChange={(e) =>
                    setCardData((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="e.g. www.bnytechnologies.com"
                  className={`w-full px-3 py-2 text-xs bg-[#F5F9F7] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] transition-all ${
                    activeFieldFocus === "website"
                      ? "border-[#45C512] bg-white ring-2 ring-[#45C512]/30"
                      : "border-[#DDEAE2]"
                  }`}
                />
              </div>

              {/* Field 6: Address */}
              <div>
                <label className="block text-xs font-bold text-[#162E3D] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#45C512]" />
                    6. Office Address *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedField("address");
                      setActiveTab("sliders");
                    }}
                    className="text-[10px] text-[#45C512] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sliders className="w-2.5 h-2.5" /> Adjust sliders
                  </button>
                </label>
                <textarea
                  rows={2}
                  value={cardData.address}
                  onFocus={() => setActiveFieldFocus("address")}
                  onBlur={() => setActiveFieldFocus(null)}
                  onChange={(e) =>
                    setCardData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="No.624, Khivraj Building, 3rdFloor,\nAnna Salai, Chennai - 600006."
                  className={`w-full px-3 py-2 text-xs bg-[#F5F9F7] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] text-[#162E3D] transition-all ${
                    activeFieldFocus === "address"
                      ? "border-[#45C512] bg-white ring-2 ring-[#45C512]/30"
                      : "border-[#DDEAE2]"
                  }`}
                />
              </div>
            </div>
          )}

          {/* TAB 2: POSITION & SIZE SLIDERS (REQUESTED FEATURE) */}
          {activeTab === "sliders" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDEAE2]">
                <div>
                  <h2 className="text-sm font-bold text-[#162E3D] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#45C512]" />
                    Interactive Sliders Studio
                  </h2>
                  <p className="text-[11px] text-[#5B7586]">
                    Select any field below or click it on the card to adjust position &amp; font size.
                  </p>
                </div>
                <button
                  onClick={resetAllLayouts}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                  title="Reset all fields to original template layout"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </div>

              {/* Field Selection Pill Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-[#162E3D] mb-1.5 uppercase tracking-wider">
                  Select Field to Adjust:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FIELD_METAS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedField === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setSelectedField(m.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                          isSelected
                            ? "bg-[#162E3D] text-[#45C512] border-[#162E3D] shadow-sm ring-2 ring-[#45C512]/30"
                            : "bg-[#F5F9F7] text-[#162E3D] border-[#DDEAE2] hover:bg-[#DDEAE2]"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-[#45C512]" : "text-[#5B7586]"}`} />
                        <span className="truncate">{m.label.replace("Employee ", "").replace("Job ", "").replace(" URL", "").replace(" Address", "")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Field Control Box */}
              <div className="p-4 bg-[#F5F9F7] rounded-2xl border border-[#DDEAE2] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#DDEAE2]">
                  <div className="flex items-center gap-2">
                    <selectedMeta.icon className="w-4 h-4 text-[#45C512]" />
                    <div>
                      <span className="text-xs font-bold text-[#162E3D]">
                        {selectedMeta.label}
                      </span>
                      <span className="text-[10px] text-[#5B7586] block">
                        {selectedMeta.description}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => resetFieldLayout(selectedField)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-[#162E3D] bg-white hover:bg-gray-100 rounded-md border border-[#DDEAE2] transition-colors cursor-pointer"
                    title="Reset this field to default position and size"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Field</span>
                  </button>
                </div>

                {/* SLIDER 1: Horizontal Position (X) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#162E3D] flex items-center gap-1">
                      <Move className="w-3.5 h-3.5 text-[#45C512]" />
                      Horizontal Position (X)
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#162E3D] bg-white px-2 py-0.5 rounded border border-[#DDEAE2]">
                      <span>{activeFieldLayout.x.toFixed(1)}%</span>
                      <span className="text-[9px] text-[#5B7586]">({Math.round((activeFieldLayout.x / 100) * 2048)}px)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nudgeField(selectedField, -0.5, 0)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-lg text-xs font-bold text-[#162E3D] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Nudge left"
                    >
                      &minus;
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.2}
                      value={activeFieldLayout.x}
                      onChange={(e) =>
                        updateFieldLayout(selectedField, {
                          x: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-white rounded-lg appearance-none cursor-pointer accent-[#45C512] border border-[#DDEAE2]"
                    />
                    <button
                      onClick={() => nudgeField(selectedField, 0.5, 0)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-lg text-xs font-bold text-[#162E3D] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Nudge right"
                    >
                      &#43;
                    </button>
                  </div>
                </div>

                {/* SLIDER 2: Vertical Position (Y) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#162E3D] flex items-center gap-1">
                      <Move className="w-3.5 h-3.5 text-[#45C512] rotate-90" />
                      Vertical Position (Y)
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#162E3D] bg-white px-2 py-0.5 rounded border border-[#DDEAE2]">
                      <span>{activeFieldLayout.y.toFixed(1)}%</span>
                      <span className="text-[9px] text-[#5B7586]">({Math.round((activeFieldLayout.y / 100) * 1024)}px)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nudgeField(selectedField, 0, -0.5)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-lg text-xs font-bold text-[#162E3D] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Nudge up"
                    >
                      &minus;
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.2}
                      value={activeFieldLayout.y}
                      onChange={(e) =>
                        updateFieldLayout(selectedField, {
                          y: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-white rounded-lg appearance-none cursor-pointer accent-[#45C512] border border-[#DDEAE2]"
                    />
                    <button
                      onClick={() => nudgeField(selectedField, 0, 0.5)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-lg text-xs font-bold text-[#162E3D] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Nudge down"
                    >
                      &#43;
                    </button>
                  </div>
                </div>

                {/* SLIDER 3: Font Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#162E3D] flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-[#45C512]" />
                      Font Size
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#162E3D] bg-white px-2 py-0.5 rounded border border-[#DDEAE2]">
                      <span>{activeFieldLayout.fontSize} px</span>
                      <span className="text-[9px] text-[#5B7586]">(canvas)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nudgeFontSize(selectedField, -2)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-lg text-xs font-bold text-[#162E3D] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Decrease font size"
                    >
                      &minus;
                    </button>
                    <input
                      type="range"
                      min={selectedMeta.minFontSize}
                      max={selectedMeta.maxFontSize}
                      step={1}
                      value={activeFieldLayout.fontSize}
                      onChange={(e) =>
                        updateFieldLayout(selectedField, {
                          fontSize: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 h-2 bg-white rounded-lg appearance-none cursor-pointer accent-[#45C512] border border-[#DDEAE2]"
                    />
                    <button
                      onClick={() => nudgeFontSize(selectedField, 2)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-lg text-xs font-bold text-[#162E3D] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Increase font size"
                    >
                      &#43;
                    </button>
                  </div>
                </div>

                {/* Text Alignment & Directional Micro-Pad */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DDEAE2]">
                  {/* Alignment */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#5B7586] uppercase tracking-wider mb-1">
                      Alignment:
                    </label>
                    <div className="flex items-center bg-white rounded-lg p-0.5 border border-[#DDEAE2]">
                      <button
                        onClick={() => updateFieldLayout(selectedField, { textAlign: "left" })}
                        className={`flex-1 py-1 flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                          (activeFieldLayout.textAlign || selectedMeta.defaultAlign) === "left"
                            ? "bg-[#162E3D] text-[#45C512]"
                            : "text-[#5B7586] hover:text-[#162E3D]"
                        }`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateFieldLayout(selectedField, { textAlign: "center" })}
                        className={`flex-1 py-1 flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                          (activeFieldLayout.textAlign || selectedMeta.defaultAlign) === "center"
                            ? "bg-[#162E3D] text-[#45C512]"
                            : "text-[#5B7586] hover:text-[#162E3D]"
                        }`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateFieldLayout(selectedField, { textAlign: "right" })}
                        className={`flex-1 py-1 flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                          (activeFieldLayout.textAlign || selectedMeta.defaultAlign) === "right"
                            ? "bg-[#162E3D] text-[#45C512]"
                            : "text-[#5B7586] hover:text-[#162E3D]"
                        }`}
                        title="Align Right"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Micro-Nudge D-Pad */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#5B7586] uppercase tracking-wider mb-1">
                      Micro Nudge:
                    </label>
                    <div className="flex items-center justify-center gap-1 bg-white rounded-lg p-0.5 border border-[#DDEAE2]">
                      <button
                        onClick={() => nudgeField(selectedField, -0.3, 0)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#162E3D] hover:bg-gray-100 cursor-pointer"
                        title="Nudge Left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => nudgeField(selectedField, 0, -0.3)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#162E3D] hover:bg-gray-100 cursor-pointer"
                        title="Nudge Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => nudgeField(selectedField, 0, 0.3)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#162E3D] hover:bg-gray-100 cursor-pointer"
                        title="Nudge Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => nudgeField(selectedField, 0.3, 0)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#162E3D] hover:bg-gray-100 cursor-pointer"
                        title="Nudge Right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Nudge Feature for Contact Block */}
              <div className="p-3 bg-[#F5F9F7] rounded-xl border border-[#DDEAE2] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#45C512]" />
                  <div>
                    <span className="font-bold text-[#162E3D]">Nudge All Contact Info:</span>
                    <span className="text-[10px] text-[#5B7586] block">Moves Phone, Email, Web &amp; Address together</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => nudgeContactGroup(-0.5, 0)}
                    className="px-2 py-1 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-md text-[10px] font-bold text-[#162E3D] cursor-pointer"
                    title="Nudge All Left"
                  >
                    &larr; Left
                  </button>
                  <button
                    onClick={() => nudgeContactGroup(0.5, 0)}
                    className="px-2 py-1 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-md text-[10px] font-bold text-[#162E3D] cursor-pointer"
                    title="Nudge All Right"
                  >
                    Right &rarr;
                  </button>
                  <button
                    onClick={() => nudgeContactGroup(0, -0.5)}
                    className="px-2 py-1 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-md text-[10px] font-bold text-[#162E3D] cursor-pointer"
                    title="Nudge All Up"
                  >
                    &uarr; Up
                  </button>
                  <button
                    onClick={() => nudgeContactGroup(0, 0.5)}
                    className="px-2 py-1 bg-white hover:bg-gray-100 border border-[#DDEAE2] rounded-md text-[10px] font-bold text-[#162E3D] cursor-pointer"
                    title="Nudge All Down"
                  >
                    Down &darr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Live Card Preview Matching Master Reference */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-[#DDEAE2] p-6 shadow-by">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDEAE2] mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#45C512] animate-pulse" />
                <h3 className="text-sm font-bold text-[#162E3D]">
                  Live Visual Preview &bull; Click Any Text on Card to Adjust
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#5B7586] bg-[#F5F9F7] px-2 py-0.5 rounded border border-[#DDEAE2]">
                  Master: 2048&times;1024 px
                </span>
              </div>
            </div>

            {/* Hint bar */}
            <div className="mb-3 px-3 py-1.5 bg-[#45C512]/10 border border-[#45C512]/30 rounded-xl flex items-center justify-between text-[11px] text-[#162E3D]">
              <span className="flex items-center gap-1.5 font-medium">
                <Sliders className="w-3.5 h-3.5 text-[#45C512]" />
                <span>
                  Currently editing: <strong className="text-[#162E3D] underline">{selectedMeta.label}</strong>. Drag sliders to adjust!
                </span>
              </span>
              <button
                onClick={() => setActiveTab("sliders")}
                className="text-[10px] font-bold text-[#162E3D] bg-white px-2 py-0.5 rounded border border-[#45C512]/40 hover:bg-[#DDEAE2] transition-colors cursor-pointer"
              >
                Open Sliders Tab &rarr;
              </button>
            </div>

            {/* VISITING CARD PREVIEW CONTAINER (Using Live Canvas & Synchronized Pixel-Perfect Overlay) */}
            <div
              ref={cardContainerRef}
              className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-300 bg-black aspect-[2/1] select-none"
              style={{ containerType: "inline-size" }}
            >
              {/* 1. Live High-DPI Master Canvas (2048x1024, auto-scaled to container width) */}
              <canvas
                ref={previewCanvasRef}
                width={2048}
                height={1024}
                className="w-full h-full object-cover block select-none pointer-events-none"
              />

              {/* 2. Interactive Selection & In-Place Typing Overlay */}
              <div className="absolute inset-0 z-10 pointer-events-auto">
                {/* 1. EMPLOYEE NAME */}
                <div
                  onClick={() => {
                    setSelectedField("name");
                    setActiveTab("sliders");
                  }}
                  title="Click to adjust Name position and size"
                  className={`absolute cursor-pointer transition-all duration-75 px-1 py-0.5 rounded ${
                    selectedField === "name" && activeFieldFocus !== "name"
                      ? "ring-2 ring-[#45C512] bg-[#45C512]/15 shadow-sm"
                      : "hover:ring-1 hover:ring-white/40"
                  }`}
                  style={{
                    left: `${layout.name.x}%`,
                    top: `${layout.name.y}%`,
                    transform:
                      (layout.name.textAlign || "left") === "center"
                        ? "translate(-50%, -50%)"
                        : (layout.name.textAlign || "left") === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(0, -50%)",
                    textAlign: layout.name.textAlign || "left",
                  }}
                >
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) =>
                      setCardData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    onFocus={() => {
                      setSelectedField("name");
                      setActiveFieldFocus("name");
                    }}
                    onBlur={() => setActiveFieldFocus(null)}
                    placeholder="Employee Name"
                    className={`border-none font-extrabold leading-none tracking-tight outline-none whitespace-nowrap transition-colors ${
                      activeFieldFocus === "name"
                        ? "text-white bg-black/70 rounded px-1.5 py-0.5 ring-2 ring-[#45C512]"
                        : "text-transparent bg-transparent placeholder:text-transparent caret-transparent cursor-pointer"
                    }`}
                    style={{
                      fontSize: `${((layout.name.fontSize || 76) * scale).toFixed(1)}px`,
                      fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                      textAlign: layout.name.textAlign || "left",
                      width: `${Math.max(6, (cardData.name || "").length + 1)}ch`,
                    }}
                  />
                </div>

                {/* 2. JOB DESIGNATION */}
                <div
                  onClick={() => {
                    setSelectedField("designation");
                    setActiveTab("sliders");
                  }}
                  title="Click to adjust Designation position and size"
                  className={`absolute cursor-pointer transition-all duration-75 px-1 py-0.5 rounded ${
                    selectedField === "designation" && activeFieldFocus !== "designation"
                      ? "ring-2 ring-[#45C512] bg-white/40 shadow-sm"
                      : "hover:ring-1 hover:ring-[#1b2817]/40"
                  }`}
                  style={{
                    left: `${layout.designation.x}%`,
                    top: `${layout.designation.y}%`,
                    transform:
                      (layout.designation.textAlign || "left") === "center"
                        ? "translate(-50%, -50%)"
                        : (layout.designation.textAlign || "left") === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(0, -50%)",
                    textAlign: layout.designation.textAlign || "left",
                  }}
                >
                  <input
                    type="text"
                    value={cardData.designation}
                    onChange={(e) =>
                      setCardData((prev) => ({ ...prev, designation: e.target.value }))
                    }
                    onFocus={() => {
                      setSelectedField("designation");
                      setActiveFieldFocus("designation");
                    }}
                    onBlur={() => setActiveFieldFocus(null)}
                    placeholder="Job Designation"
                    className={`border-none font-bold leading-tight outline-none whitespace-nowrap transition-colors ${
                      activeFieldFocus === "designation"
                        ? "text-[#1b2817] bg-white/90 rounded px-1.5 py-0.5 ring-2 ring-[#45C512]"
                        : "text-transparent bg-transparent placeholder:text-transparent caret-transparent cursor-pointer"
                    }`}
                    style={{
                      fontSize: `${((layout.designation.fontSize || 40) * scale).toFixed(1)}px`,
                      fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                      textAlign: layout.designation.textAlign || "left",
                      width: `${Math.max(10, (cardData.designation || "").length + 1)}ch`,
                    }}
                  />
                </div>

                {/* 3. PHONE NUMBER */}
                <div
                  onClick={() => {
                    setSelectedField("phone");
                    setActiveTab("sliders");
                  }}
                  title="Click to adjust Phone position and size"
                  className={`absolute cursor-pointer transition-all duration-75 px-1 py-0.5 rounded ${
                    selectedField === "phone" && activeFieldFocus !== "phone"
                      ? "ring-2 ring-[#45C512] bg-black/50 shadow-sm"
                      : "hover:ring-1 hover:ring-white/40"
                  }`}
                  style={{
                    left: `${layout.phone.x}%`,
                    top: `${layout.phone.y}%`,
                    transform:
                      (layout.phone.textAlign || "left") === "center"
                        ? "translate(-50%, -50%)"
                        : (layout.phone.textAlign || "left") === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(0, -50%)",
                    textAlign: layout.phone.textAlign || "left",
                  }}
                >
                  <input
                    type="text"
                    value={cardData.phone}
                    onChange={(e) =>
                      setCardData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    onFocus={() => {
                      setSelectedField("phone");
                      setActiveFieldFocus("phone");
                    }}
                    onBlur={() => setActiveFieldFocus(null)}
                    placeholder="Phone Number"
                    className={`border-none font-bold tracking-wide outline-none whitespace-nowrap transition-colors ${
                      activeFieldFocus === "phone"
                        ? "text-white bg-black/80 rounded px-1.5 py-0.5 ring-2 ring-[#45C512]"
                        : "text-transparent bg-transparent placeholder:text-transparent caret-transparent cursor-pointer"
                    }`}
                    style={{
                      fontSize: `${((layout.phone.fontSize || 44) * scale).toFixed(1)}px`,
                      fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                      textAlign: layout.phone.textAlign || "left",
                      width: `${Math.max(10, (cardData.phone || "").length + 1)}ch`,
                    }}
                  />
                </div>

                {/* 4. EMAIL ADDRESS */}
                <div
                  onClick={() => {
                    setSelectedField("email");
                    setActiveTab("sliders");
                  }}
                  title="Click to adjust Email position and size"
                  className={`absolute cursor-pointer transition-all duration-75 px-1 py-0.5 rounded ${
                    selectedField === "email" && activeFieldFocus !== "email"
                      ? "ring-2 ring-[#45C512] bg-black/50 shadow-sm"
                      : "hover:ring-1 hover:ring-white/40"
                  }`}
                  style={{
                    left: `${layout.email.x}%`,
                    top: `${layout.email.y}%`,
                    transform:
                      (layout.email.textAlign || "left") === "center"
                        ? "translate(-50%, -50%)"
                        : (layout.email.textAlign || "left") === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(0, -50%)",
                    textAlign: layout.email.textAlign || "left",
                  }}
                >
                  <input
                    type="text"
                    value={cardData.email}
                    onChange={(e) =>
                      setCardData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    onFocus={() => {
                      setSelectedField("email");
                      setActiveFieldFocus("email");
                    }}
                    onBlur={() => setActiveFieldFocus(null)}
                    placeholder="Email Address"
                    className={`border-none font-bold outline-none whitespace-nowrap transition-colors ${
                      activeFieldFocus === "email"
                        ? "text-white bg-black/80 rounded px-1.5 py-0.5 ring-2 ring-[#45C512]"
                        : "text-transparent bg-transparent placeholder:text-transparent caret-transparent cursor-pointer"
                    }`}
                    style={{
                      fontSize: `${((layout.email.fontSize || 40) * scale).toFixed(1)}px`,
                      fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                      textAlign: layout.email.textAlign || "left",
                      width: `${Math.max(12, (cardData.email || "").length + 1)}ch`,
                    }}
                  />
                </div>

                {/* 5. WEBSITE URL */}
                <div
                  onClick={() => {
                    setSelectedField("website");
                    setActiveTab("sliders");
                  }}
                  title="Click to adjust Website position and size"
                  className={`absolute cursor-pointer transition-all duration-75 px-1 py-0.5 rounded ${
                    selectedField === "website" && activeFieldFocus !== "website"
                      ? "ring-2 ring-[#45C512] bg-black/50 shadow-sm"
                      : "hover:ring-1 hover:ring-white/40"
                  }`}
                  style={{
                    left: `${layout.website.x}%`,
                    top: `${layout.website.y}%`,
                    transform:
                      (layout.website.textAlign || "left") === "center"
                        ? "translate(-50%, -50%)"
                        : (layout.website.textAlign || "left") === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(0, -50%)",
                    textAlign: layout.website.textAlign || "left",
                  }}
                >
                  <input
                    type="text"
                    value={cardData.website}
                    onChange={(e) =>
                      setCardData((prev) => ({ ...prev, website: e.target.value }))
                    }
                    onFocus={() => {
                      setSelectedField("website");
                      setActiveFieldFocus("website");
                    }}
                    onBlur={() => setActiveFieldFocus(null)}
                    placeholder="Website URL"
                    className={`border-none font-bold outline-none whitespace-nowrap transition-colors ${
                      activeFieldFocus === "website"
                        ? "text-white bg-black/80 rounded px-1.5 py-0.5 ring-2 ring-[#45C512]"
                        : "text-transparent bg-transparent placeholder:text-transparent caret-transparent cursor-pointer"
                    }`}
                    style={{
                      fontSize: `${((layout.website.fontSize || 40) * scale).toFixed(1)}px`,
                      fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                      textAlign: layout.website.textAlign || "left",
                      width: `${Math.max(12, (cardData.website || "").length + 1)}ch`,
                    }}
                  />
                </div>

                {/* 6. OFFICE ADDRESS */}
                <div
                  onClick={() => {
                    setSelectedField("address");
                    setActiveTab("sliders");
                  }}
                  title="Click to adjust Address position and size"
                  className={`absolute cursor-pointer transition-all duration-75 px-1 py-0.5 rounded ${
                    selectedField === "address" && activeFieldFocus !== "address"
                      ? "ring-2 ring-[#45C512] bg-black/50 shadow-sm"
                      : "hover:ring-1 hover:ring-white/40"
                  }`}
                  style={{
                    left: `${layout.address.x}%`,
                    top: `${layout.address.y}%`,
                    transform:
                      (layout.address.textAlign || "left") === "center"
                        ? "translate(-50%, -50%)"
                        : (layout.address.textAlign || "left") === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(0, -50%)",
                    textAlign: layout.address.textAlign || "left",
                  }}
                >
                  {activeFieldFocus === "address" ? (
                    <textarea
                      rows={2}
                      value={cardData.address}
                      onChange={(e) =>
                        setCardData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      onBlur={() => setActiveFieldFocus(null)}
                      autoFocus
                      className="bg-black/80 text-white font-bold leading-tight outline-none border border-[#45C512] rounded p-1 resize-none shadow-lg whitespace-pre"
                      style={{
                        fontSize: `${((layout.address.fontSize || 32) * scale).toFixed(1)}px`,
                        lineHeight: 1.25,
                        fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                        textAlign: layout.address.textAlign || "left",
                      }}
                    />
                  ) : (
                    <div
                      onDoubleClick={() => setActiveFieldFocus("address")}
                      className="text-transparent font-bold leading-tight select-none whitespace-nowrap pointer-events-auto"
                      style={{
                        fontSize: `${((layout.address.fontSize || 32) * scale).toFixed(1)}px`,
                        lineHeight: 1.25,
                        fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
                        textAlign: layout.address.textAlign || "left",
                      }}
                    >
                      <div>{addrLine1 || "No.624, Khivraj Building, 3rdFloor,"}</div>
                      {addrLine2 && <div>{addrLine2}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template Specs Badge Row */}
            <div className="mt-4 pt-4 border-t border-[#DDEAE2] flex flex-wrap items-center justify-between text-xs text-[#5B7586] gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#162E3D]">Interactive Studio:</span>
                <span>Click any text box on the card or use the sliders to fine-tune layout.</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#45C512] font-semibold">
                <span>Print-Ready: 300 DPI (2048&times;1024)</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTON BAR: PREVIEW, DOWNLOAD PNG, DOWNLOAD PDF */}
          <div className="bg-white rounded-2xl border border-[#DDEAE2] p-4 shadow-by flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleGenerateCard}
              disabled={isGenerating}
              className="flex-1 w-full py-3 px-4 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-[#162E3D]" />
              <span>{isGenerating ? "GENERATING..." : "PREVIEW CARD"}</span>
            </button>

            <button
              onClick={handleDownloadPng}
              className="w-full sm:w-auto py-3 px-4 bg-[#162E3D] hover:bg-[#244254] text-[#45C512] font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="w-full sm:w-auto py-3 px-4 bg-white hover:bg-gray-50 text-[#162E3D] font-bold text-xs rounded-xl border border-[#DDEAE2] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-[#162E3D]" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="w-full sm:w-auto py-3 px-3 bg-[#F5F9F7] hover:bg-[#DDEAE2] text-[#162E3D] font-bold text-xs rounded-xl border border-[#DDEAE2] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print standard business card"
            >
              <Printer className="w-4 h-4 text-[#162E3D]" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* PREVIEW & GENERATION MODAL */}
      {isGeneratedModalOpen && generatedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative bg-[#162E3D] border border-white/20 rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between text-white pb-3 border-b border-white/15">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#45C512] text-[#162E3D]">
                    ✓ GENERATED WITH CUSTOM SLIDER POSITIONS
                  </span>
                  <span className="text-xs text-white/60 font-mono">
                    2048 &times; 1024 px &bull; 300 DPI High-Quality
                  </span>
                </div>
                <h3 className="text-lg font-bold font-serif uppercase tracking-wider mt-1 text-white">
                  Visiting Card &bull; {cardData.name} ({cardData.designation})
                </h3>
              </div>
              <button
                onClick={() => setIsGeneratedModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Render */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black aspect-[2/1]">
              <img
                src={generatedImageUrl}
                alt="Generated Visiting Card"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-white/70">
                Text box positions and font sizes reflect your exact slider adjustments.
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-[#45C512]" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copied!" : "Copy Image"}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#162E3D] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:bg-gray-100"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print (3.5 &times; 2 in)</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-[#162E3D] text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#162E3D]" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handleDownloadPng}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#45C512] hover:bg-[#3db010] text-[#162E3D] text-xs font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG (2048&times;1024)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
