import type { Metadata } from "next";
import { LenisProvider } from "@/components/ui/LenisProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Showrunner — AI Production Copilot",
  description:
    "Predict retention, diagnose story weaknesses, and render multi-voice audio episodes. The AI content intelligence platform for serialized audio.",
  keywords: ["AI", "audio", "production", "retention", "story intelligence", "PocketFM"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
