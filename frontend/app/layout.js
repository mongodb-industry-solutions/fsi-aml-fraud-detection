import { GeistSans } from 'geist/font/sans';
import ClientLayout from '@/components/ClientLayout';

export const metadata = {
  title: 'ThreatSight 360 - Fraud Detection',
  description: 'Advanced fraud detection for financial transactions',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
