"use client";

import Icon from "@leafygreen-ui/icon";
import { palette } from "@leafygreen-ui/palette";
import { Body } from "@leafygreen-ui/typography";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import styles from "./UserMenu.module.css";

// Main Leafy Bank retail UI — where the retail personas (who have no dedicated
// backoffice demo of their own) are diverted to.
const LEAFY_BANK_HOME =
  "https://leafy-bank-bian-ui.industrysolutions.prod.corp.mongodb.com/";

// The persona whose point of view this demo represents. Fixed — this is the
// AML/fraud tool, so Ana is always the current user here.
const CURRENT_USER_ID = "67a1000000000000000000002";

// Same persona roster as the Leafy Bank UI. Every entry other than the current
// user carries a `url` that diverts to that persona's own demo; retail users
// have no dedicated demo, so they route back to the main Leafy Bank UI.
const SECTIONS = [
  {
    section: "retail",
    label: "Bank Customers",
    users: [
      {
        id: "65a546ae4a8f64e8f88fb89e",
        name: "Frida",
        role: "Leafy Bank Customer",
        // Deep-link the persona so the Leafy Bank UI auto-selects Frida and
        // skips its login modal (the `?user=` param carries the choice across
        // origins). Value is Frida's backend bankUsername.
        url: `${LEAFY_BANK_HOME}?user=fridaklo`,
      },
      {
        id: "66fe219d625d93a100528224",
        name: "Grace",
        role: "Leafy Bank Customer",
        url: `${LEAFY_BANK_HOME}?user=gracehop`,
      },
    ],
  },
  {
    section: "backoffice",
    label: "Backoffice",
    users: [
      {
        id: "67a1000000000000000000001",
        name: "Marc",
        role: "Finance Operator",
        url: "https://leafy-bank-bian-ui.industrysolutions.prod.corp.mongodb.com/gl-pipeline-monitor",
      },
      {
        id: "67a1000000000000000000002",
        name: "Ana",
        role: "Risk Analyst",
        url: null,
      },
      {
        id: "67a1000000000000000000004",
        name: "Sophia",
        role: "Investment Portfolio Manager",
        url: "https://capital-markets-ui.industrysolutions.prod.corp.mongodb.com/",
      },
      {
        id: "67a1000000000000000000003",
        name: "Luke",
        role: "Payments Operations",
        url: "https://fsi-payments-processing-bian.industrysolutions.prod.corp.mongodb.com/",
      },
      {
        id: "67a1000000000000000000006",
        name: "Maria",
        role: "Document Analyst",
        url: "https://document-intelligence-ui-bian.industrysolutions.prod.corp.mongodb.com/",
      },
    ],
  },
];

const CURRENT_USER = SECTIONS.flatMap((s) => s.users).find(
  (u) => u.id === CURRENT_USER_ID,
);

// The in-demo role Ana is acting under. Unlike the personas above this is real
// application state — it gates which pages appear in the nav (see ROUTE_ROLES
// in ClientLayout) — so it's kept in UserContext, not here.
const ROLES = [
  { id: "risk_analyst", name: "Risk Analyst", initials: "RA", color: palette.blue.dark1 },
  { id: "risk_manager", name: "Risk Manager", initials: "RM", color: palette.gray.dark1 },
];

/**
 * Top-right user panel mirroring the Leafy Bank UI: shows the current persona
 * (Ana) and the role she's acting under, with a dropdown that does two distinct
 * things. Picking another *persona* diverts to that persona's own demo in a new
 * tab — no state changes here, since this demo has one fixed point of view.
 * Picking a *role* switches Ana between Risk Analyst and Risk Manager, which
 * changes the nav in place.
 */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const { role, setRole } = useUser();
  const wrapperRef = useRef(null);
  const currentRole = ROLES.find((r) => r.id === role) ?? ROLES[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleSelect = (user) => {
    setOpen(false);
    if (user.id === CURRENT_USER_ID || !user.url) return;
    window.open(user.url, "_blank", "noopener,noreferrer");
  };

  const handleSelectRole = (nextRole) => {
    setOpen(false);
    if (nextRole === role) return;
    setRole(nextRole);
  };

  return (
    <div className={styles.userMenuWrapper} ref={wrapperRef}>
      <div className={styles.userInfoContainer}>
        <Image
          src={`/users/${CURRENT_USER.id}.png`}
          alt={CURRENT_USER.name}
          width={30}
          height={40}
          className={styles.userImage}
        />
        <div className={styles.userDetails}>
          <Body>{CURRENT_USER.name}</Body>
          <div className={styles.userRole}>{currentRole.name}</div>
        </div>
        <button
          type="button"
          className={styles.switchUserBtn}
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Switch user"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Switch user"
        >
          <Icon glyph="Refresh" size="small" />
        </button>
      </div>

      {open && (
        <div className={styles.userDropdown} role="menu">
          {SECTIONS.map(({ section, label, users }) => (
            <div key={section} className={styles.userDropdownSection}>
              <div className={styles.userDropdownSectionLabel}>{label}</div>
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  role="menuitem"
                  className={`${styles.userDropdownItem} ${user.id === CURRENT_USER_ID ? styles.userDropdownItemActive : ""}`}
                  onClick={() => handleSelect(user)}
                >
                  <Image
                    src={`/users/${user.id}.png`}
                    alt={user.name}
                    width={32}
                    height={32}
                    className={styles.userDropdownAvatar}
                  />
                  <div className={styles.userDropdownInfo}>
                    <Body weight="medium">{user.name}</Body>
                    <span className={styles.userDropdownRole}>{user.role}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}

          <div className={styles.userDropdownSection}>
            <div className={styles.userDropdownSectionLabel}>Switch Role</div>
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="menuitem"
                className={`${styles.userDropdownItem} ${r.id === currentRole.id ? styles.userDropdownItemActive : ""}`}
                onClick={() => handleSelectRole(r.id)}
              >
                <span
                  className={styles.roleAvatar}
                  style={{ backgroundColor: r.color }}
                  aria-hidden="true"
                >
                  {r.initials}
                </span>
                <div className={styles.userDropdownInfo}>
                  <Body weight="medium">{r.name}</Body>
                  <span className={styles.userDropdownRole}>
                    {r.id === currentRole.id ? "Current role" : "Switch to this role"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
