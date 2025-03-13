"use client";

import Link from "next/link";
import Button from "@leafygreen-ui/button";
import Card from "@leafygreen-ui/card";
import { H1, H2, H3, Subtitle, Body } from "@leafygreen-ui/typography";
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
        borderRadius: '8px'
      }}>
        <H1>
          ThreatSight 360
        </H1>
        <H3 style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
          Advanced Fraud Detection for Financial Services
        </H3>
        <Body style={{ maxWidth: '800px', margin: '0 auto', marginBottom: spacing[4] }}>
          ThreatSight 360 uses advanced machine learning and pattern recognition to detect and prevent fraudulent financial transactions in real-time.
        </Body>
        <Link href="/transaction-simulator">
          <Button variant="primary" size="large">
            Try Transaction Simulator
          </Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[4] }}>
        <Card style={{ flex: '1 1 300px' }}>
          <div style={{ marginBottom: spacing[2], color: palette.green.dark2 }}>
            <Icon glyph="Charts" size="large" />
          </div>
          <H3 style={{ marginBottom: spacing[2] }}>
            Real-time Analysis
          </H3>
          <Body>
            Analyze transactions in real-time using behavioral patterns and historical data to identify suspicious activities.
          </Body>
        </Card>

        <Card style={{ flex: '1 1 300px' }}>
          <div style={{ marginBottom: spacing[2], color: palette.green.dark2 }}>
            <Icon glyph="Lock" size="large" />
          </div>
          <H3 style={{ marginBottom: spacing[2] }}>
            Fraud Prevention
          </H3>
          <Body>
            Detect and prevent fraudulent transactions before they occur, protecting your customers and your business.
          </Body>
        </Card>

        <Card style={{ flex: '1 1 300px' }}>
          <div style={{ marginBottom: spacing[2], color: palette.green.dark2 }}>
            <Icon glyph="ImportantWithCircle" size="large" />
          </div>
          <H3 style={{ marginBottom: spacing[2] }}>
            Risk Assessment
          </H3>
          <Body>
            Comprehensive risk scoring system evaluates transactions across multiple dimensions to provide accurate risk assessment.
          </Body>
        </Card>
      </div>

      <div style={{ textAlign: 'center', marginTop: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          Ready to see it in action?
        </H3>
        <Link href="/transaction-simulator">
          <Button variant="primary">
            Go to Transaction Simulator
          </Button>
        </Link>
      </div>
    </div>
  );
}