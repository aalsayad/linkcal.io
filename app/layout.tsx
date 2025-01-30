import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import Sidebar from "@/components/Sidebar/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkCal",
  description: "LinkCal by effekt.design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="h-screen w-screen flex">
          <div className="w-fit h-full">
            <Sidebar />
          </div>

          {/* Main content area with offset */}
          <div className="w-full flex flex-col items-center min-h-screen overflow-y-auto">
            {/* <Navbar /> */}
            <div className="max-w-[1350px] w-full p-8">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
