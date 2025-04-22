"use client";

import Link from 'next/link';
import Card from '@leafygreen-ui/card';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { H1, Overline, Body } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';
import { useState } from 'react';

export default function ClientLayout({ children }) {
  const [isMenuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        style={{
          backgroundColor: palette.green.dark2,
          color: palette.gray.light3,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderBottom: `1px solid ${palette.green.dark3}`,
          padding: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: isMenuOpen ? 'wrap' : 'nowrap',
            padding: `${spacing[3]}px ${spacing[3]}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <H1
                style={{
                  fontSize: '28px',
                  lineHeight: '32px',
                  margin: 0,
                  padding: 0,
                  color: palette.gray.light3,
                  fontFamily: "'Euclid Circular A', sans-serif",
                  fontWeight: 700,
                }}
              >
                ThreatSight360
              </H1>
              <Overline
                style={{
                  color: palette.gray.light2,
                  margin: 0,
                  fontFamily: "'Euclid Circular A', sans-serif",
                  fontWeight: 400,
                }}
              >
                Fraud Detection System
              </Overline>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              aria-label="Toggle Menu"
              onClick={() => setMenuOpen(!isMenuOpen)}
              className="mobile-menu-toggle"
              style={{ display: 'none' }}
            >
              <Icon glyph={isMenuOpen ? "X" : "Menu"} />
            </IconButton>

            <nav
              style={{
                display: isMenuOpen ? 'block' : 'flex',
                alignItems: 'center',
              }}
            >
              <ul
                style={{
                  display: 'flex',
                  gap: spacing[3],
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  flexDirection: isMenuOpen ? 'column' : 'row',
                }}
              >
                <li>
                  <Link
                    href="/"
                    style={{
                      color: palette.gray.light3,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[1],
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = palette.green.dark1;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon glyph="Home" fill={palette.gray.light3} /> 
                    <Body style={{ fontFamily: "'Euclid Circular A', sans-serif", fontWeight: 500 }}>Home</Body>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/transaction-simulator"
                    style={{
                      color: palette.gray.light3,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[1],
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = palette.green.dark1;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon glyph="CreditCard" fill={palette.gray.light3} /> 
                    <Body style={{ fontFamily: "'Euclid Circular A', sans-serif", fontWeight: 500 }}>Transaction Simulator</Body>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/risk-models"
                    style={{
                      color: palette.gray.light3,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[1],
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = palette.green.dark1;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon glyph="Settings" fill={palette.gray.light3} /> 
                    <Body style={{ fontFamily: "'Euclid Circular A', sans-serif", fontWeight: 500 }}>Risk Models</Body>
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Empty div to maintain spacing */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginLeft: spacing[4],
            }}></div>
          </div>
        </div>
      </header>

      <main>
        <div style={{ backgroundColor: palette.gray.light3, minHeight: 'calc(100vh - 74px)', padding: spacing[3] }}>
          <Card style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            padding: spacing[4],
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            border: `1px solid ${palette.gray.light2}`
          }}>
            {children}
          </Card>
        </div>
      </main>

      <style jsx global>{`
        /**
         * Euclid
         */

        /* Semibold */
        @font-face {
          font-family: "Euclid Circular A";
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Semibold-WebXL.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Semibold-WebXL.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Semibold.ttf")
              format("truetype");
          font-weight: 700;
          font-style: normal;
        }
        
        /* Semibold Italic */
        @font-face {
          font-family: "Euclid Circular A";
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-SemiboldItalic-WebXL.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-SemiboldItalic-WebXL.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-SemiboldItalic.ttf")
              format("truetype");
          font-weight: 700;
          font-style: italic;
        }
        
        /* Medium */
        @font-face {
          font-family: "Euclid Circular A";
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Medium-WebXL.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Medium-WebXL.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Medium.ttf")
              format("truetype");
          font-weight: 500;
          font-style: normal;
        }
        
        /* Medium Italic */
        @font-face {
          font-family: "Euclid Circular A";
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-MediumItalic-WebXL.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-MediumItalic-WebXL.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-MediumItalic.ttf")
              format("truetype");
          font-weight: 500;
          font-style: italic;
        }
        
        /* Normal */
        @font-face {
          font-family: "Euclid Circular A";
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Regular-WebXL.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Regular-WebXL.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-Regular.ttf")
              format("truetype");
          font-weight: 400, normal;
          font-style: normal;
        }
        
        /* Italic */
        @font-face {
          font-family: "Euclid Circular A";
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-RegularItalic-WebXL.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-RegularItalic-WebXL.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/euclid-circular/EuclidCircularA-RegularItalic.ttf")
              format("truetype");
          font-weight: 400, normal;
          font-style: italic;
        }
        
        /**
          * Value Serif
          */
        
        /* Bold */
        @font-face {
          font-family: "MongoDB Value Serif";
          font-weight: 700, bold;
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Bold.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Bold.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Bold.ttf")
              format("truetype");
        }
        
        /* Medium */
        @font-face {
          font-family: "MongoDB Value Serif";
          font-weight: 500;
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Medium.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Medium.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Medium.ttf")
              format("truetype");
        }
        
        /* Normal */
        @font-face {
          font-family: "MongoDB Value Serif";
          font-weight: 400, normal;
          src: url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Regular.woff")
              format("woff"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Regular.woff2")
              format("woff2"),
            url("https://d2va9gm4j17fy9.cloudfront.net/fonts/value-serif/MongoDBValueSerif-Regular.ttf")
              format("truetype");
        }

        body {
          font-family: "Euclid Circular A", sans-serif;
        }

        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
          
          nav {
            display: ${isMenuOpen ? 'block' : 'none'} !important;
            width: 100%;
            margin-top: ${spacing[3]}px;
          }
          
          nav ul {
            flex-direction: column !important;
          }
        }
      `}</style>
    </>
  );
}