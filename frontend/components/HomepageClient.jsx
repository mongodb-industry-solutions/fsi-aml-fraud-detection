"use client";

import Link from "next/link";
import Button from "@leafygreen-ui/button";
import Card from "@leafygreen-ui/card";
import { H1, H2, H3, Subtitle, Body, Description, Link as LGLink } from "@leafygreen-ui/typography";
import { spacing } from "@leafygreen-ui/tokens";
import { palette } from "@leafygreen-ui/palette";
import Icon from "@leafygreen-ui/icon";
import Badge from "@leafygreen-ui/badge";
import Image from "next/image";
import Banner from "@leafygreen-ui/banner";
import { useUser } from "@/contexts/UserContext";

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
          <Image 
            src="/threatsight logo.png" 
            alt="ThreatSight Logo" 
            width={60} 
            height={60}
            style={{ borderRadius: '8px' }}
          />
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

      <H2 style={{ marginBottom: spacing[4], textAlign: 'center' }}>Core Capabilities</H2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing[3], marginBottom: spacing[5] }}>
        {role === 'risk_analyst' && (
          <>

            <Card 
              contentStyle="clickable"
              as={Link}
              href="/entities"
              style={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `2px solid ${palette.blue.light2}`,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              {...cardHoverStyles}
            >
              <div style={{ marginBottom: spacing[2], color: palette.blue.dark1 }}>
                <Icon glyph="Person" size="large" />
              </div>
              <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
                Entity Management
              </H3>
              <Description style={{ color: palette.gray.dark1 }}>
                Central hub for managing customer and entity profiles. MongoDB $graphLookup powers network analysis to uncover hidden relationships and assess collective risk across connected entities.
              </Description>
            </Card>

            <Card 
              contentStyle="clickable"
              as={Link}
              href="/entity-resolution/enhanced"
              style={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `2px solid ${palette.purple.light2}`,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              {...cardHoverStyles}
            >
              <div style={{ marginBottom: spacing[2], color: palette.purple.dark1 }}>
                <Icon glyph="MagnifyingGlass" size="large" />
              </div>
              <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
                Entity Resolution/KYC
              </H3>
              <Description style={{ color: palette.gray.dark1 }}>
                Find duplicate entities and match identities across systems. MongoDB $rankFusion combines Atlas text search with vector embeddings to catch variations in names, addresses, and identifiers.
              </Description>
            </Card>

            <Card 
              contentStyle="clickable"
              as={Link}
              href="/transaction-simulator"
              style={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `2px solid ${palette.green.light2}`,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              {...cardHoverStyles}
            >
              <div style={{ marginBottom: spacing[2], color: palette.green.dark1 }}>
                <Icon glyph="CreditCard" size="large" />
              </div>
              <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
                Transaction Simulator
              </H3>
              <Description style={{ color: palette.gray.dark1 }}>
                Test fraud detection with real-time transaction monitoring. Uses MongoDB Atlas Vector Search to compare transaction patterns against known fraud embeddings for instant risk assessment.
              </Description>
            </Card>
            
          </>
        )}

        {role === 'risk_manager' && (
          <Card 
            contentStyle="clickable"
            as={Link}
            href="/risk-models"
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: `2px solid ${palette.gray.light1}`,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            {...cardHoverStyles}
          >
            <div style={{ marginBottom: spacing[2], color: palette.gray.dark1 }}>
              <Icon glyph="Settings" size="large" />
            </div>
            <H3 style={{ marginBottom: spacing[2], color: palette.gray.dark2 }}>
              Risk Models
            </H3>
            <Description style={{ color: palette.gray.dark1 }}>
              Configure fraud detection rules and risk thresholds. MongoDB aggregation pipelines enable complex multi-factor scoring with real-time updates as new patterns emerge.
            </Description>
          </Card>
        )}
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