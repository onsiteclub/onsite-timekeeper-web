import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnSite Timekeeper - Web Portal",
  description: "Digital time tracking for construction workers",
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
