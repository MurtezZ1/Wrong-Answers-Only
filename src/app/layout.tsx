import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wrong Answers Only",
  description: "A playful quiz generator for delightfully incorrect answers.",
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
