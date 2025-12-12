"use client";

import { useState } from 'react';
import Modal from '@leafygreen-ui/modal';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import { H1, H2, H3, Body, Description } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';

const ROLE_CONFIG = {
  risk_analyst: {
    name: 'Risk Analyst',
    icon: 'MagnifyingGlass',
    color: palette.blue.dark1,
    borderColor: palette.blue.light2,
    features: [
      'Entity Management',
      'Entity Resolution',
      'Transaction Screening'
    ],
    description: 'Analyze entities, resolve duplicates, and screen transactions for fraud patterns.'
  },
  risk_manager: {
    name: 'Risk Manager',
    icon: 'Settings',
    color: palette.gray.dark1,
    borderColor: palette.gray.light1,
    features: [
      'Risk Model Management'
    ],
    description: 'Configure fraud detection rules and risk thresholds.'
  }
};

export default function UserSelectionModal({ isSwitching = false, onClose }) {
  const { setRole } = useUser();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleConfirm = () => {
    if (selectedRole) {
      setRole(selectedRole);
      if (onClose) {
        onClose();
      }
    }
  };

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
    <Modal
      open={true}
      setOpen={() => {
        if (isSwitching && onClose) {
          onClose();
        }
      }}
      size="large"
    >
      <div style={{ 
        padding: spacing[5],
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: spacing[5] 
        }}>
          <H1 style={{ 
            marginBottom: spacing[2],
            color: palette.gray.dark2
          }}>
            Welcome to ThreatSight 360
          </H1>
          <Description style={{ 
            color: palette.gray.dark1,
            fontSize: '16px'
          }}>
            This is a demo solution
          </Description>
        </div>

        {/* Instructions */}
        <Body style={{ 
          textAlign: 'center',
          marginBottom: spacing[5],
          color: palette.gray.dark1
        }}>
          Please select the user you would like to login as:
        </Body>

        {/* Role Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: spacing[4],
          marginBottom: spacing[5]
        }}>
          {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => (
            <Card
              key={roleKey}
              contentStyle="clickable"
              onClick={() => handleRoleSelect(roleKey)}
              style={{
                cursor: 'pointer',
                border: `2px solid ${selectedRole === roleKey ? config.borderColor : palette.gray.light2}`,
                backgroundColor: selectedRole === roleKey ? palette.gray.light3 : 'white',
                boxShadow: selectedRole === roleKey 
                  ? '0 4px 16px rgba(0,0,0,0.12)' 
                  : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
                padding: spacing[4]
              }}
              {...cardHoverStyles}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: spacing[3]
              }}>
                {/* Avatar */}
                <Avatar style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: config.color,
                  color: 'white',
                  fontSize: '32px',
                  fontWeight: 'bold'
                }}>
                  <AvatarFallback style={{
                    backgroundColor: config.color,
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold'
                  }}>
                    <Icon glyph={config.icon} size="xlarge" fill="white" />
                  </AvatarFallback>
                </Avatar>

                {/* Role Name */}
                <H3 style={{ 
                  margin: 0,
                  color: palette.gray.dark2,
                  textAlign: 'center'
                }}>
                  {config.name}
                </H3>

                {/* Description */}
                <Description style={{ 
                  textAlign: 'center',
                  color: palette.gray.dark1,
                  marginBottom: spacing[2]
                }}>
                  {config.description}
                </Description>

                {/* Features List */}
                <div style={{
                  width: '100%',
                  paddingTop: spacing[3],
                  borderTop: `1px solid ${palette.gray.light2}`
                }}>
                  <Body style={{ 
                    fontWeight: 600,
                    marginBottom: spacing[2],
                    color: palette.gray.dark2
                  }}>
                    Accessible Features:
                  </Body>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing[1]
                  }}>
                    {config.features.map((feature, idx) => (
                      <li key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[1],
                        color: palette.gray.dark1
                      }}>
                        <Icon glyph="Checkmark" size="small" fill={config.color} />
                        <Body style={{ fontSize: '14px' }}>{feature}</Body>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Note */}
        <Description style={{ 
          textAlign: 'center',
          color: palette.gray.dark1,
          marginBottom: spacing[4],
          fontStyle: 'italic'
        }}>
          Note: Each role has access to different features. You can switch roles at any time during your session.
        </Description>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: spacing[3]
        }}>
          {isSwitching && (
            <Button
              variant="default"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedRole}
          >
            Continue as {selectedRole ? ROLE_CONFIG[selectedRole].name : '...'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

