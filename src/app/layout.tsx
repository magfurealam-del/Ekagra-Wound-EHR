import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Ekagra Wound Care EHR", description: "Physician-first wound care clinical workspace" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
