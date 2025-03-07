"use client";

import '../styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ShowRate Manager',
  description: 'A web application designed to help SDRs improve their demo show rates',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
} 