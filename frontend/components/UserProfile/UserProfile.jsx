"use client";

import { useState } from 'react';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import Icon from '@leafygreen-ui/icon';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserSelectionModal from '@/components/UserSelection/UserSelectionModal';

import styles from "./UserProfile.module.css";

const ROLE_CONFIG = {
  risk_analyst: {
    name: 'Risk Analyst',
    icon: 'MagnifyingGlass',
    color: palette.blue.dark1,
    initials: 'RA'
  },
  risk_manager: {
    name: 'Risk Manager',
    icon: 'Settings',
    color: palette.gray.dark1,
    initials: 'RM'
  }
};

function UserProfile() {
  const { role } = useUser();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  if (!role) return null;

  const config = ROLE_CONFIG[role];

  const handleSwitchUser = () => {
    setShowSwitchModal(true);
  };

  const handleModalClose = () => {
    setShowSwitchModal(false);
  };

  return (
    <>
      <div 
        className={styles.profileContainer}
        onClick={handleSwitchUser}
        style={{ 
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Click to switch user"
      >
        <Avatar style={{
          width: '32px',
          height: '32px',
          backgroundColor: config.color,
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          <AvatarFallback style={{
            backgroundColor: config.color,
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {config.initials}
          </AvatarFallback>
        </Avatar>
        <Body className={styles.userName}>{config.name}</Body>
        <Icon glyph="CaretDown" fill={palette.gray.light3} size={12} />
      </div>

      {showSwitchModal && (
        <UserSelectionModal 
          isSwitching={true}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}

export default UserProfile;