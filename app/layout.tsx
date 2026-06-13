import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./_components/sw-register";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Ghana Youth Jobs — Real opportunities for Ghana's youth",
  description:
    "Verified jobs, apprenticeships, internships, gigs and skills training for young people in Ghana. Mobile-first, low-data, and free for job seekers.",
  applicationName: "Ghana Youth Jobs",
  authors: [{ name: "Ghana Youth Jobs" }],
  appleWebApp: {
    capable: true,
    title: "GYJ Jobs",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
