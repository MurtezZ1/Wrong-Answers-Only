import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Wrong Answers Only",
    template: "%s | Wrong Answers Only",
  },
  description:
    "Generate playful trivia quizzes where every visible answer is plausible, witty, and intentionally wrong.",
  applicationName: "Wrong Answers Only",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Wrong Answers Only",
    description:
      "A playful AI trivia game where every visible answer is intentionally wrong.",
    type: "website",
  },
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
