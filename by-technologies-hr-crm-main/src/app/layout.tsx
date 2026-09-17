import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "B & Y Technologies | HR & Employee CRM",
  description:
    "HR CRM and Employee Self-Service Portal for B & Y Technologies, digital marketing agency.",
  icons: {
    icon: "/logo-badge.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-badge.png" />
      </head>
      <body className="antialiased bg-[#F5F9F7] text-[#162E3D]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
