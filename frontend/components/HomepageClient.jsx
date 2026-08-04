"use client";

import Link from "next/link";
import Button from "@leafygreen-ui/button";
import Card from "@leafygreen-ui/card";
import { H1, H2, H3, Subtitle, Body, Description, Link as LGLink } from "@leafygreen-ui/typography";
import { spacing } from "@leafygreen-ui/tokens";
import { palette } from "@leafygreen-ui/palette";
import Icon from "@leafygreen-ui/icon";
import Badge from "@leafygreen-ui/badge";
import Banner from "@leafygreen-ui/banner";
import { MongoDBLogoMark } from "@leafygreen-ui/logo";
import { useUser } from "@/contexts/UserContext";

const ROLE_LABELS = {
  risk_analyst: 'Risk Analyst',
  risk_manager: 'Risk Manager',
};

// Every capability is listed for both personas; `role` decides which ones are
// actually reachable (ClientLayout redirects the others away anyway).
const CAPABILITIES = [
  {
    href: '/investigations',
    role: 'risk_analyst',
    glyph: 'ActivityFeed',
    iconColor: palette.yellow.dark2,
    borderColor: palette.yellow.light2,
    title: 'Agentic Investigation',
    description: "AI-powered multi-agent investigation pipeline built on LangGraph. MongoDB MongoDBSaver enables durable human-in-the-loop review, $graphLookup powers network traversal, Atlas Search drives RAG over typologies and compliance policies, and the flexible document model stores complete investigations as single rich documents.",
  },
  {
    href: '/entities',
    role: 'risk_analyst',
    glyph: 'Person',
    iconColor: palette.blue.dark1,
    borderColor: palette.blue.light2,
    title: 'Entity Management',
    description: 'Central hub for managing customer and entity profiles. MongoDB $graphLookup powers network analysis to uncover hidden relationships and assess collective risk across connected entities.',
  },
  {
    href: '/entity-resolution/enhanced',
    role: 'risk_analyst',
    glyph: 'MagnifyingGlass',
    iconColor: palette.purple.dark1,
    borderColor: palette.purple.light2,
    title: 'Entity Resolution/KYC',
    description: 'Find duplicate entities and match identities across systems. MongoDB $rankFusion combines Atlas text search with vector embeddings to catch variations in names, addresses, and identifiers.',
  },
  {
    href: '/transaction-simulator',
    role: 'risk_analyst',
    glyph: 'CreditCard',
    iconColor: palette.green.dark1,
    borderColor: palette.green.light2,
    title: 'Transaction Simulator',
    description: 'Test fraud detection with real-time transaction monitoring. Uses MongoDB Atlas Vector Search to compare transaction patterns against known fraud embeddings for instant risk assessment.',
  },
  {
    href: '/risk-models',
    role: 'risk_manager',
    glyph: 'Settings',
    iconColor: palette.gray.dark1,
    borderColor: palette.gray.light1,
    title: 'Risk Models',
    description: 'Configure fraud detection rules and risk thresholds. MongoDB aggregation pipelines enable complex multi-factor scoring with real-time updates as new patterns emerge.',
  },
];

export default function HomepageClient() {
  const { role } = useUser();
  const cardHoverStyles = {
    onMouseEnter: (e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <Card style={{ 
        textAlign: 'center', 
        marginBottom: spacing[5], 
        padding: spacing[5],
        background: `linear-gradient(135deg, ${palette.green.light3} 0%, ${palette.green.light2} 100%)`,
        borderRadius: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        border: `1px solid ${palette.green.light1}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
          <MongoDBLogoMark height={56} aria-label="ThreatSight Logo" />
          <H1 style={{ margin: 0 }}>
            ThreatSight 360
          </H1>
        </div>
        <H3 style={{ color: palette.gray.dark1, marginBottom: spacing[4], maxWidth: '800px', margin: '0 auto' }}>
          Fraud Detection & AML/KYC Compliance (FRAML) Platform
        </H3>
        <Description style={{ color: palette.gray.dark1, marginBottom: spacing[4], maxWidth: '600px', margin: '0 auto' }}>
          Advanced entity resolution, network analysis, and real-time transaction monitoring powered by MongoDB
        </Description>
      </Card>

      {role && (
        <Banner 
          variant="info" 
          style={{ marginBottom: spacing[4] }}
        >
          You are currently logged in as <strong>{role === 'risk_analyst' ? 'Risk Analyst' : 'Risk Manager'}</strong>. Switch users from your profile menu to explore different features.
        </Banner>
      )}

      <H2 style={{ marginBottom: spacing[2], textAlign: 'center' }}>Core Capabilities</H2>
      <Description style={{ textAlign: 'center', marginBottom: spacing[4], color: palette.gray.dark1 }}>
        Each capability is tagged with the persona that owns it. Cards outside your current
        persona are shown for context and unlock when you switch users.
      </Description>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing[3], marginBottom: spacing[5] }}>
        {[...CAPABILITIES]
          .sort((a, b) => (a.role === role ? 0 : 1) - (b.role === role ? 0 : 1))
          .map((cap) => {
            const available = cap.role === role;
            const cardProps = available
              ? { contentStyle: 'clickable', as: Link, href: cap.href, ...cardHoverStyles }
              : {};

            return (
              <Card
                key={cap.href}
                {...cardProps}
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `2px solid ${available ? cap.borderColor : palette.gray.light2}`,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  cursor: available ? 'pointer' : 'default',
                  opacity: available ? 1 : 0.65,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing[2],
                  marginBottom: spacing[2],
                }}>
                  <span style={{ color: available ? cap.iconColor : palette.gray.dark1, display: 'flex' }}>
                    <Icon glyph={cap.glyph} size="large" />
                  </span>
                  <Badge variant={cap.role === 'risk_manager' ? 'blue' : 'green'}>
                    {ROLE_LABELS[cap.role]}
                  </Badge>
                </div>
                <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
                  {cap.title}
                </H3>
                <Description style={{ color: palette.gray.dark1 }}>
                  {cap.description}
                </Description>
                {!available && (
                  <Description style={{ marginTop: spacing[2], color: palette.gray.dark1, fontStyle: 'italic' }}>
                    Available as {ROLE_LABELS[cap.role]} — switch users from your profile menu.
                  </Description>
                )}
              </Card>
            );
          })}
      </div>

      <div style={{ 
        marginTop: spacing[5],
        textAlign: 'center',
        color: palette.gray.dark1
      }}>
        <H3 style={{ marginBottom: spacing[3] }}>Powered by MongoDB</H3>
        <Description style={{ maxWidth: '600px', margin: '0 auto' }}>
          Built on MongoDB's advanced features including $rankFusion hybrid search, $graphLookup for network analysis, and Atlas Vector Search for AI-powered entity matching
        </Description>
      </div>
    </div>
  );
}