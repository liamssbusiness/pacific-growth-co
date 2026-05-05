import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pacific Growth Co — AI-Powered Marketing for Small Business",
  description:
    "Your AI marketing team. Daily ad creative, real competitor research, and a performance dashboard — on a simple monthly retainer. Cancel anytime.",
  openGraph: {
    title: "Pacific Growth Co",
    description:
      "Daily ad creative, real competitor research. Monthly retainer, no contracts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
