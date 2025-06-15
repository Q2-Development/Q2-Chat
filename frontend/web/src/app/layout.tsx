import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Q2 Chat",
  description: "Q2Chat is a UI that lets you use any model on one platform.",
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
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { 
              background: '#262626', 
              color: '#fff',
              border: '1px solid #404040'
            },
            success: {
              style: {
                background: '#262626',
                color: '#10b981',
                border: '1px solid #10b981'
              }
            },
            error: {
              style: {
                background: '#262626', 
                color: '#ef4444',
                border: '1px solid #ef4444'
              }
            }
          }}
        />
      </body>
    </html>
  );
}