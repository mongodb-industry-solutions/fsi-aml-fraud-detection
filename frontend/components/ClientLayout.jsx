"use client";

import Link from 'next/link';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

export default function ClientLayout({ children }) {
  return (
    <>
      <header
        style={{
          backgroundColor: palette.green.dark3,
          color: palette.gray.light3,
          padding: spacing[3],
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
            <h1 style={{ margin: 0, fontSize: '24px' }}>
              ThreatSight 360
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              Fraud Detection System
            </p>
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
                  style={{ color: 'white', textDecoration: 'none' }}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/transaction-simulator"
                  style={{ color: 'white', textDecoration: 'none' }}
                >
                  Transaction Simulator
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer
        style={{
          backgroundColor: palette.gray.dark3,
          color: palette.gray.light2,
          padding: spacing[3],
          marginTop: spacing[4],
          fontSize: '14px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          &copy; {new Date().getFullYear()} ThreatSight 360 -
          Powered by MongoDB Atlas
        </div>
      </footer>
    </>
  );
}