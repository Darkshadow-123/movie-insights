import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Brew - AI Movie Insights',
  description: 'Enter a movie title to get detailed insights, cast info, and AI-powered sentiment analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        
        <main style={{ minHeight: '100vh' }}>
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
