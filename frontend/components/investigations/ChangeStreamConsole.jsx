"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

import { connectAlertStream } from '@/lib/agent-api';

const FONT = "'Euclid Circular A', sans-serif";

const formatEventTime = (timestamp) => {
  const d = timestamp ? new Date(timestamp) : new Date();
  return d.toLocaleTimeString('en-US', { hour12: false });
};

const getEventColor = (type, operationType) => {
  if (type === 'alert_change') {
    return operationType === 'insert' ? palette.green.light2 : palette.blue.light2;
  }
  if (type === 'investigation_change') {
    return operationType === 'insert' ? palette.yellow.light2 : palette.blue.light2;
  }
  return palette.gray.light2;
};

const getEventDescription = (event) => {
  if (event.type === 'alert_change') {
    const a = event.alert || {};
    if (event.operationType === 'insert') {
      return `New alert: entity=${a.entity_id || '?'} type=${a.alert_type || '?'} status=${a.status || 'pending'}`;
    }
    return `Alert updated: entity=${a.entity_id || '?'} status=${a.status || '?'}`;
  }
  if (event.type === 'investigation_change') {
    const inv = event.investigation || {};
    if (event.operationType === 'insert') {
      return `Investigation filed: ${inv.case_id || '?'} entity=${inv.entity_id || '?'} status=${inv.investigation_status || '?'}`;
    }
    return `Investigation updated: ${inv.case_id || '?'} status=${inv.investigation_status || '?'}`;
  }
  return JSON.stringify(event).slice(0, 100);
};

export default function ChangeStreamConsole({ onInvestigationChange }) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    const handle = connectAlertStream((event) => {
      if (event.type === '_connected') {
        setConnected(true);
        setReconnecting(false);
        return;
      }
      if (event.type === '_disconnected') {
        setConnected(false);
        return;
      }
      if (event.type === '_error') {
        setConnected(false);
        return;
      }
      if (event.type === 'initial') {
        return;
      }

      setEvents(prev => [event, ...prev].slice(0, 20));

      if (event.type === 'investigation_change' && onInvestigationChange) {
        onInvestigationChange(event);
      }
    });

    return () => { handle?.close(); };
  }, [onInvestigationChange]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const statusColor = connected
    ? palette.green.dark1
    : reconnecting
    ? palette.yellow.dark1
    : palette.red.dark1;

  const statusLabel = connected
    ? 'LIVE'
    : reconnecting
    ? 'RECONNECTING...'
    : 'DISCONNECTED';

  const statusTextColor = connected
    ? palette.green.dark2
    : reconnecting
    ? palette.yellow.dark2
    : palette.red.dark2;

  return (
    <div style={{
      padding: spacing[2],
      backgroundColor: palette.green.light3,
      borderRadius: 6,
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${palette.green.light1}`,
    }}>
      {/* Status indicator */}
      <div style={{
        position: 'absolute', top: 6, right: 8,
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{
          height: 8, width: 8, borderRadius: '50%',
          backgroundColor: statusColor, marginRight: 4,
          animation: connected || reconnecting ? 'cs-console-pulse 2s infinite' : 'none',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 11, color: statusTextColor, fontFamily: FONT, fontWeight: 600 }}>
          {statusLabel}
        </span>
      </div>

      <Body style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT, color: palette.gray.dark2, marginBottom: spacing[1] }}>
        Change Stream Events
      </Body>

      {/* Dark console */}
      <div style={{
        marginTop: spacing[1],
        fontSize: 12,
        fontFamily: 'monospace',
        backgroundColor: palette.gray.dark3,
        color: palette.gray.light3,
        padding: spacing[2],
        borderRadius: 4,
        maxHeight: 200,
        overflowY: 'auto',
        lineHeight: 1.6,
      }}>
        <div style={{ color: palette.green.light2 }}>
          {'>> '}MongoDB Change Stream watching collections: alerts, investigations
        </div>
        <div style={{ color: palette.yellow.light2 }}>
          {'>> '}Watching for operations: [&quot;insert&quot;, &quot;update&quot;, &quot;replace&quot;]
        </div>
        <div style={{
          color: connected ? palette.green.light2 : reconnecting ? palette.yellow.light2 : palette.red.light2,
        }}>
          {'>> '}WebSocket connection status: {statusLabel}
        </div>
        {connected && events.length === 0 && (
          <div style={{
            borderTop: `1px solid ${palette.gray.dark2}`,
            margin: `${spacing[1]}px 0`, paddingTop: spacing[1],
            fontStyle: 'italic', color: palette.gray.light1,
          }}>
            {'>> '}Waiting for change events... Launch an investigation to see real-time updates.
          </div>
        )}

        {events.length > 0 && (
          <>
            <div style={{
              borderTop: `1px solid ${palette.gray.dark2}`,
              margin: `${spacing[1]}px 0`, paddingTop: spacing[1],
            }}>
              <span style={{ color: palette.yellow.light2 }}>
                Recent events ({events.length}):
              </span>
            </div>
            {events.map((event, idx) => (
              <div
                key={idx}
                className={idx === 0 ? 'cs-highlight-update' : ''}
                style={{
                  color: getEventColor(event.type, event.operationType),
                  marginTop: 2,
                  padding: '2px 0',
                }}
              >
                {'>> '}{formatEventTime(event.timestamp)} [{event.operationType}] {getEventDescription(event)}
              </div>
            ))}
          </>
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Educational note */}
      <div style={{
        marginTop: spacing[1], fontSize: 10, fontFamily: FONT,
        color: palette.green.dark2, lineHeight: 1.5,
      }}>
        <strong>MongoDB Change Streams:</strong> Real-time event notifications via <code style={{ fontSize: 10 }}>db.watch()</code> on
        the <code style={{ fontSize: 10 }}>alerts</code> and <code style={{ fontSize: 10 }}>investigations</code> collections.
        No polling, no message queue &mdash; MongoDB pushes events as they happen.
      </div>

      <style>{`
        @keyframes cs-console-pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .cs-highlight-update {
          animation: cs-console-highlight 2s ease;
        }
        @keyframes cs-console-highlight {
          0% { background-color: transparent; }
          50% { background-color: rgba(255, 214, 0, 0.3); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
}
