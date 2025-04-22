"use client";

import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';

import styles from "./UserProfile.module.css";

function UserProfile() {
  return (
    <div className={styles.profileContainer}>
      <div className={styles.avatar}>
        TS
      </div>
      <Body className={styles.userName}>Admin</Body>
    </div>
  );
}

export default UserProfile;