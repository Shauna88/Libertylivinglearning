import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liberty Living QMS — Quality & Training Hub",
  description:
    "Liberty Living Homecare Quality Management System and Staff Training Hub — policies, SOPs, and auditable training completions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
