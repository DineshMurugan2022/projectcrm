"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import VisitingCardSection from "@/components/admin/VisitingCardSection";

export default function VisitingCardPage() {
  return (
    <div className="min-h-screen bg-[#F5F9F7] flex flex-col">
      {/* Top Brand Bar */}
      <header className="bg-white border-b border-[#DDEAE2] px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="B & Y Technologies"
                className="h-10 object-contain group-hover:opacity-90 transition-opacity"
              />
            </Link>
            <div className="h-6 w-[1px] bg-[#DDEAE2] hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#162E3D]">
              <CreditCard className="w-4 h-4 text-[#45C512]" />
              <span>Visiting Card Generator</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#45C512]/20 text-[#162E3D]">
                Official Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#162E3D] bg-[#F5F9F7] hover:bg-[#DDEAE2] rounded-xl transition-colors border border-[#DDEAE2]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#162E3D]" />
              <span>Back to HR Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <VisitingCardSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DDEAE2] bg-white py-4 px-6 text-center text-xs text-[#5B7586]">
        <p>&copy; 2026 B &amp; Y Technologies. Official Corporate Visiting Card System.</p>
      </footer>
    </div>
  );
}
