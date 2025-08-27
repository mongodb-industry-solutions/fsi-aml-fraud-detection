/**
 * EntityLink Component - Proper anchor tag for entity navigation
 * 
 * Enables right-click "Open in new tab" functionality while maintaining 
 * existing onClick behavior for left clicks.
 */

"use client";

import { useRouter } from 'next/navigation';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';

function EntityLink({ 
  entityId, 
  children, 
  weight = "medium", 
  style = {},
  className = "",
  onClick = null,
  underline = true
}) {
  const router = useRouter();

  const handleClick = (e) => {
    // If custom onClick provided, call it first
    if (onClick) {
      onClick(entityId, e);
    }
    
    // For left clicks (not middle click or ctrl+click), prevent default and use router
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      router.push(`/entities/${entityId}`);
    }
    // For middle clicks, ctrl+clicks, etc., let the browser handle it naturally
  };

  return (
    <a
      href={`/entities/${entityId}`}
      onClick={handleClick}
      style={{
        color: palette.blue.base,
        textDecoration: underline ? 'underline' : 'none',
        cursor: 'pointer',
        ...style
      }}
      className={className}
      onMouseEnter={(e) => {
        e.target.style.color = palette.blue.dark1;
      }}
      onMouseLeave={(e) => {
        e.target.style.color = palette.blue.base;
      }}
    >
      <Body weight={weight} style={{ color: 'inherit', ...style }}>
        {children}
      </Body>
    </a>
  );
}

export default EntityLink;