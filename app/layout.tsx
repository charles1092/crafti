import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crafti - AI Communications Toolkit",
  description: "Create and analyse professional communications with AI-powered stakeholder insights and critical perspectives",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
