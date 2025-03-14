"use client";

import Link from "next/link";
import Button from "@leafygreen-ui/button";
import Card from "@leafygreen-ui/card";
import { H1, H2, H3, Subtitle, Body, Description, Link as LGLink } from "@leafygreen-ui/typography";
import { spacing } from "@leafygreen-ui/tokens";
import { palette } from "@leafygreen-ui/palette";
import Icon from "@leafygreen-ui/icon";

export default function HomepageClient() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: spacing[4], 
        padding: spacing[4],
        backgroundColor: palette.green.light3,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: `1px solid ${palette.green.light1}`
      }}>
        <H1>
          ThreatSight 360
        </H1>
        <H3 style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
          Advanced Fraud Detection for Financial Services
        </H3>
        <Description style={{ maxWidth: '800px', margin: '0 auto', marginBottom: spacing[4], fontSize: '16px' }}>
          ThreatSight 360 uses advanced machine learning and pattern recognition to detect and prevent fraudulent financial transactions in real-time.
        </Description>
        <Link href="/transaction-simulator">
          <Button 
            variant="primary" 
            size="large" 
            leftGlyph={<Icon glyph="Play" fill={palette.green.light3} />}
            style={{ backgroundColor: palette.green.dark2, color: palette.gray.light3 }}
          >
            Try Transaction Simulator
          </Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[4] }}>
        <Card style={{ 
            flex: '1 1 300px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${palette.blue.light2}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            }
          }}>
          <div style={{ marginBottom: spacing[2], color: palette.blue.base }}>
            <Icon glyph="Charts" size="large" />
          </div>
          <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
            Real-time Analysis
          </H3>
          <Description style={{ color: palette.gray.dark1 }}>
            Analyze transactions in real-time using behavioral patterns and historical data to identify suspicious activities.
          </Description>
        </Card>

        <Card style={{ 
            flex: '1 1 300px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${palette.green.light2}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            }
          }}>
          <div style={{ marginBottom: spacing[2], color: palette.green.dark1 }}>
            <Icon glyph="Lock" size="large" />
          </div>
          <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
            Fraud Prevention
          </H3>
          <Description style={{ color: palette.gray.dark1 }}>
            Detect and prevent fraudulent transactions before they occur, protecting your customers and your business.
          </Description>
        </Card>

        <Card style={{ 
            flex: '1 1 300px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${palette.yellow.light2}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            }
          }}>
          <div style={{ marginBottom: spacing[2], color: palette.yellow.dark2 }}>
            <Icon glyph="ImportantWithCircle" size="large" />
          </div>
          <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
            Risk Assessment
          </H3>
          <Description style={{ color: palette.gray.dark1 }}>
            Comprehensive risk scoring system evaluates transactions across multiple dimensions to provide accurate risk assessment.
          </Description>
        </Card>
      </div>

      <div style={{ textAlign: 'center', marginTop: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          Ready to see it in action?
        </H3>
        <div style={{ marginBottom: spacing[3] }}>
          <LGLink 
            href="/transaction-simulator" 
            arrowAppearance="persist" 
            style={{ fontSize: '16px' }}
          >
            Go to Transaction Simulator
          </LGLink>
        </div>
        <Link href="/transaction-simulator">
          <Button 
            variant="primary" 
            rightGlyph={<Icon glyph="ArrowRight" fill={palette.green.light3} />}
            style={{ backgroundColor: palette.green.dark2, color: palette.gray.light3 }}
          >
            Start Now
          </Button>
        </Link>
      </div>
    </div>
  );
}