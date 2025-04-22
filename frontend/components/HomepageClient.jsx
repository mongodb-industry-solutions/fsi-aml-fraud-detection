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
      <Card style={{ 
        textAlign: 'center', 
        marginBottom: spacing[4], 
        padding: spacing[4],
        backgroundColor: palette.green.light3,
        borderRadius: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${palette.green.light1}`
      }}>
        <H1>
          ThreatSight 360
        </H1>
        <H3 style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
          Advanced Fraud Detection for Financial Services
        </H3>
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
      </Card>

      <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[4] }}>
        <Card 
          contentStyle="clickable"
          as={Link}
          href="/transaction-simulator"
          style={{ 
            flex: '1 1 300px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${palette.blue.light2}`,
            textDecoration: 'none'
          }}
        >
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

        <Card 
          contentStyle="clickable"
          as={Link}
          href="/transaction-simulator"
          style={{ 
            flex: '1 1 300px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${palette.green.light2}`,
            textDecoration: 'none'
          }}
        >
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

        <Card 
          contentStyle="clickable"
          as={Link}
          href="/transaction-simulator"
          style={{ 
            flex: '1 1 300px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${palette.yellow.light2}`,
            textDecoration: 'none'
          }}
        >
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

      <div style={{ 
        textAlign: 'center', 
        marginTop: spacing[4],
        padding: spacing[3],
        backgroundColor: palette.gray.light2,
        borderRadius: '8px'
      }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          Ready to see it in action?
        </H3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
          <Button
            variant="primary"
            size="large"
            leftGlyph={<Icon glyph="ArrowRight" fill={palette.gray.light3} />}
            as={Link}
            href="/transaction-simulator"
            style={{ backgroundColor: palette.green.dark2, color: palette.gray.light3 }}
          >
            Go to Transaction Simulator
          </Button>
          
          <Button
            variant="baseGreen"
            size="large"
            leftGlyph={<Icon glyph="Settings" fill={palette.gray.light3} />}
            as={Link}
            href="/risk-models"
          >
            Manage Risk Models
          </Button>
        </div>
      </div>
    </div>
  );
}