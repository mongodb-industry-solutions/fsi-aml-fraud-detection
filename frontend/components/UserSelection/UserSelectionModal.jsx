"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@leafygreen-ui/modal';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import { H1, H3, Body, Description } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import styles from './UserSelectionModal.module.css';

const ROLE_CONFIG = {
  risk_analyst: {
    name: 'Risk Analyst',
    icon: 'MagnifyingGlass',
    color: palette.blue.dark1,
    borderColor: palette.blue.light2,
    features: [
      'Entity Management',
      'Entity Resolution',
      'Transaction Screening',
      'Agentic Investigation'
    ],
    description: 'Analyze entities, resolve duplicates, screen transactions, and run AI-powered agentic investigations with human-in-the-loop review.'
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
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleConfirm = () => {
    if (selectedRole) {
      setRole(selectedRole);
      if (isSwitching) {
        router.push('/');
      }
      if (onClose) {
        onClose();
      }
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
      shouldClose={() => isSwitching}
      size="large"
      contentClassName={!isSwitching ? styles.blockingModal : undefined}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <H1 className={styles.title} style={{ color: palette.gray.dark2 }}>
            {isSwitching ? 'Switch Role' : 'Welcome to ThreatSight 360'}
          </H1>
          {!isSwitching && (
            <Description className={styles.subtitle} style={{ color: palette.gray.dark1 }}>
              This is a demo solution
            </Description>
          )}
        </div>

        <Body className={styles.instructions} style={{ color: palette.gray.dark1 }}>
          {isSwitching
            ? 'Select a different role to switch to:'
            : 'Choose your role to get started:'}
        </Body>

        <div
          className={styles.cardGrid}
          role="radiogroup"
          aria-label="Role selection"
        >
          {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
            const isSelected = selectedRole === roleKey;
            return (
              <Card
                key={roleKey}
                contentStyle="clickable"
                className={styles.roleCard}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelectedRole(roleKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedRole(roleKey);
                  }
                }}
                style={{
                  border: `2px solid ${isSelected ? config.borderColor : palette.gray.light2}`,
                  backgroundColor: isSelected ? palette.gray.light3 : 'white',
                  boxShadow: isSelected
                    ? '0 4px 16px rgba(0,0,0,0.12)'
                    : undefined,
                }}
              >
                <div className={styles.cardInner}>
                  <Avatar className={styles.avatar} style={{ backgroundColor: config.color }}>
                    <AvatarFallback className={styles.avatarFallback} style={{ backgroundColor: config.color }}>
                      <Icon glyph={config.icon} size="xlarge" fill="white" />
                    </AvatarFallback>
                  </Avatar>

                  <H3 className={styles.roleName} style={{ color: palette.gray.dark2 }}>
                    {config.name}
                  </H3>

                  <Description className={styles.roleDescription} style={{ color: palette.gray.dark1 }}>
                    {config.description}
                  </Description>

                  <div className={styles.featureSection} style={{ borderTop: `1px solid ${palette.gray.light2}` }}>
                    <Body className={styles.featureHeading} style={{ color: palette.gray.dark2 }}>
                      Accessible Features:
                    </Body>
                    <ul className={styles.featureList}>
                      {config.features.map((feature, idx) => (
                        <li key={idx} className={styles.featureItem} style={{ color: palette.gray.dark1 }}>
                          <Icon glyph="Checkmark" size="small" fill={config.color} />
                          <Body className={styles.featureText}>{feature}</Body>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Description className={styles.note} style={{ color: palette.gray.dark1 }}>
          Note: Each role has access to different features. You can switch roles at any time during your session.
        </Description>

        <div className={styles.actions}>
          {isSwitching && (
            <Button variant="default" onClick={onClose}>
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
