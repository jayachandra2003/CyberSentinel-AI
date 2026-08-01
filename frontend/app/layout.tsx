import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/providers/AppProvider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export const metadata: Metadata = {
  title: "CyberSentinel AI - Defensive Security Platform",
  description: "Enterprise defensive AI-powered web security assessment platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-cyber-dark dark:text-slate-100 min-h-screen flex flex-col antialiased transition-colors duration-200">
        <ErrorBoundary>
          <AppProvider>{children}</AppProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
