import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghana Youth Jobs — Real opportunities for Ghana's youth",
  description:
    "Verified jobs, apprenticeships, internships, gigs and skills training for young people in Ghana. Mobile-first, low-data, and free for job seekers.",
  applicationName: "Ghana Youth Jobs",
  authors: [{ name: "Ghana Youth Jobs" }],
  openGraph: {
    title: "Ghana Youth Jobs",
    description:
      "Real, verified opportunities for young people in Ghana. Built mobile-first and low-data.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1410",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
