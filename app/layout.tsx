import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Brew - AI Movie Insights',
  description: 'Enter a movie title to get detailed insights, cast info, and AI-powered sentiment analysis',
};

import { Navbar } from './components/layout/Navbar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Navbar />
        <main style={{ minHeight: '100vh', padding: "26px" }}>
          {children}
        </main>
        <footer className="footer">
          <div className="container">
            <p>Powered by OMDb API</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
