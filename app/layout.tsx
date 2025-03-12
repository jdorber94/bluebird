import '../styles/globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Bluebird | Demo Show Rate Tracker',
  description: 'A web application designed to help SDRs improve their demo show rates',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
} 