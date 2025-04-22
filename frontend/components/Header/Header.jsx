"use client";

import { useState } from "react";
import { Body, H1, Overline } from '@leafygreen-ui/typography';
import Link from 'next/link';
import Image from 'next/image';
import IconButton from '@leafygreen-ui/icon-button';
import Icon from '@leafygreen-ui/icon';
import { palette } from '@leafygreen-ui/palette';

import UserProfile from '@/components/UserProfile/UserProfile';
import styles from "./Header.module.css";

function Header() {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  return (
    <div className={styles["layout-header"]}>
      <div className={styles["logo-container"]}>
        <div>
          <H1 className={styles.title}>ThreatSight360</H1>
          <Overline className={styles.subtitle}>Fraud Detection System</Overline>
        </div>
      </div>

      <div className={`${styles["pages-container"]} ${isMenuOpen ? styles.show : ''}`}>
        <Link href="/" className={styles.navLink}>
          <Icon glyph="Home" fill={palette.gray.light3} /> 
          <Body>Home</Body>
        </Link>
        <Link href="/transaction-simulator" className={styles.navLink}>
          <Icon glyph="CreditCard" fill={palette.gray.light3} /> 
          <Body>Transaction Simulator</Body>
        </Link>
        
        <Link href="/risk-models" className={styles.navLink}>
          <Icon glyph="Settings" fill={palette.gray.light3} /> 
          <Body>Risk Models</Body>
        </Link>
        
        <div className={styles.linkHideDesktop}>
          <Body>Log Out</Body>
        </div>
      </div>

      <div className={styles["right-container"]}>
        <UserProfile />
        
        {/* Desktop Logout Icon Button */}
        <IconButton
          aria-label="LogOut"
          className={styles.logoutIcon}
        >
          <Icon glyph="LogOut" />
        </IconButton>

        {/* Hamburger Menu Button */}
        <IconButton aria-label="Menu" onClick={toggleMenu} className={styles.hamburgerIcon}>
          <Icon glyph={isMenuOpen ? "X" : "Menu"} />
        </IconButton>
      </div>
    </div>
  );
}

export default Header;