import { GeistSans } from 'geist/font/sans';
import ClientLayout from '@/components/ClientLayout';
import { UserProvider } from '@/contexts/UserContext';

export const metadata = {
  title: 'ThreatSight 360 - Fraud Detection',
  description: 'Advanced fraud detection for financial transactions',
  icons: {
    icon: '/threatsight-logo.svg',
    shortcut: '/threatsight-logo.svg',
    apple: '/threatsight-logo.svg',
  },
};

export default function RootLayout({ children }) {
  // CI bakes BIAN_MODEL_URL per environment (kaniko build_args). It must be a
  // build arg, not a Kanopy runtime env var: this layout is statically
  // prerendered, so the value is frozen into the HTML at `npm run build`.
  // Unset (local `npm run dev`) → fall back to the deployed staging explorer so
  // the link works without running the bian-model container locally.
  const bianModelUrl =
    process.env.BIAN_MODEL_URL ||
    'https://leafy-bank-bian-model.industrysolutions.staging.corp.mongodb.com';

  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <UserProvider>
          <ClientLayout bianModelUrl={bianModelUrl}>
            {children}
          </ClientLayout>
        </UserProvider>
      </body>
    </html>
  );
}
