import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import Sidebar from "@/components/Sidebar/Sidebar";
import QueryProvider from "@/components/QueryProvider";

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
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <html lang="en">
        <head />
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <div className="h-screen w-screen flex">
            <div className="w-fit h-full">
              <Sidebar />
            </div>
            {/* Main content area */}
            <div className="w-full flex flex-col items-center overflow-y-auto">
              {/* <Navbar /> can be re-enabled if needed */}
              <div className="max-w-[1350px] w-full p-8 py-5">{children}</div>
            </div>
          </div>
        </body>
      </html>
    </QueryProvider>
  );
}
