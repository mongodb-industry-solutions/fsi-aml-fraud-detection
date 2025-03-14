"use client";

import Link from 'next/link';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Icon from '@leafygreen-ui/icon';
import { H1, Overline, Disclaimer } from '@leafygreen-ui/typography';

export default function ClientLayout({ children }) {
  return (
    <>
      <header
        style={{
          backgroundColor: palette.green.dark2,
          color: palette.gray.light3,
          padding: spacing[3],
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderBottom: `1px solid ${palette.green.dark3}`
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <H1 style={{ margin: 0, fontSize: '24px', color: palette.gray.light3 }}>
              ThreatSight 360
            </H1>
            <Overline style={{ margin: '4px 0 0 0', color: palette.gray.light3 }}>
              Fraud Detection System
            </Overline>
          </div>
          <nav>
            <ul
              style={{
                display: 'flex',
                gap: spacing[3],
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              <li>
                <Link
                  href="/"
                  style={{ color: palette.gray.light3, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: spacing[1] }}
                >
                  <Icon glyph="Home" fill={palette.gray.light3} /> Home
                </Link>
              </li>
              <li>
                <Link
                  href="/transaction-simulator"
                  style={{ color: palette.gray.light3, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: spacing[1] }}
                >
                  <Icon glyph="CreditCard" fill={palette.gray.light3} /> Transaction Simulator
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer
        style={{
          backgroundColor: palette.gray.dark2,
          color: palette.gray.light3,
          padding: spacing[3],
          marginTop: spacing[4],
          fontSize: '14px',
          borderTop: `1px solid ${palette.gray.dark3}`
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <Disclaimer style={{ color: palette.gray.light3 }}>
            &copy; {new Date().getFullYear()} ThreatSight 360 -
            Powered by MongoDB Atlas
          </Disclaimer>
        </div>
      </footer>
    </>
  );
}