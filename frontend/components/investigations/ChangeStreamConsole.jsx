"use client";

import React, { useState, useEffect, useRef } from 'react';
import Icon from '@leafygreen-ui/icon';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

import { connectAlertStream } from '@/lib/agent-api';
import { uiTokens } from './investigationTokens';

const FONT = uiTokens.font;

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
      return `New alert: entity=${a.entity_id || '?'} type=${a.alert_type || '?'}`;
    }
    return `Alert updated: entity=${a.entity_id || '?'} status=${a.status || '?'}`;
  }
  if (event.type === 'investigation_change') {
    const inv = event.investigation || {};
    if (event.operationType === 'insert') {
      return `Investigation filed: ${inv.case_id || '?'} entity=${inv.entity_id || '?'}`;
    }
    return `Investigation updated: ${inv.case_id || '?'} status=${inv.investigation_status || '?'}`;
  }
  return JSON.stringify(event).slice(0, 80);
};

export default function ChangeStreamConsole({ onInvestigationChange }) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const [expanded, setExpanded] = useState(false);
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
    if (expanded) consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, expanded]);

  const statusColor = connected
    ? palette.green.dark1
    : reconnecting
    ? palette.yellow.dark1
    : palette.red.dark1;

  const statusLabel = connected
    ? 'LIVE'
    : reconnecting
    ? 'RECONNECTING'
    : 'OFFLINE';

  const statusTextColor = connected
    ? palette.green.dark2
    : reconnecting
    ? palette.yellow.dark2
    : palette.red.dark2;

  const latestEvent = events[0];

  return (
    <div style={{
      padding: `${spacing[2]}px`,
      backgroundColor: palette.green.light3,
      borderRadius: 6,
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${palette.green.light1}`,
      flexShrink: 0,
      transition: `all ${uiTokens.transitionMedium}`,
    }}>
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', fontFamily: FONT,
        }}
      >
        <Body style={{
          fontSize: 12, fontWeight: 700, fontFamily: FONT,
          color: palette.gray.dark2, margin: 0,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Change Streams
          <span style={{
            height: 7, width: 7, borderRadius: '50%',
            backgroundColor: statusColor,
            animation: connected || reconnecting ? 'subtlePulse 2s infinite' : 'none',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: statusTextColor }}>
            {statusLabel}
          </span>
          {!expanded && events.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 500, color: palette.gray.base,
              padding: '1px 5px', borderRadius: 3,
              background: uiTokens.surface1, border: `1px solid ${uiTokens.borderDefault}`,
            }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          )}
        </Body>
        <Icon
          glyph="ChevronDown"
          size={14}
          style={{
            color: palette.gray.dark1,
            transition: `transform ${uiTokens.transitionFast}`,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Collapsed preview: latest event */}
      {!expanded && latestEvent && (
        <div style={{
          marginTop: 6,
          fontSize: 10,
          fontFamily: 'monospace',
          color: palette.green.dark2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {formatEventTime(latestEvent.timestamp)} [{latestEvent.operationType}] {getEventDescription(latestEvent)}
        </div>
      )}

      {/* Expanded console */}
      {expanded && (
        <>
          <div style={{
            marginTop: spacing[1],
            fontSize: 11,
            fontFamily: 'monospace',
            backgroundColor: palette.gray.dark3,
            color: palette.gray.light3,
            padding: spacing[2],
            borderRadius: 4,
            maxHeight: 180,
            overflowY: 'auto',
            lineHeight: 1.6,
          }}>
            <div style={{ color: palette.green.light2 }}>
              {'>> '}Watching: alerts, investigations
            </div>
            <div style={{
              color: connected ? palette.green.light2 : reconnecting ? palette.yellow.light2 : palette.red.light2,
            }}>
              {'>> '}Status: {statusLabel}
            </div>
            {connected && events.length === 0 && (
              <div style={{
                borderTop: `1px solid ${palette.gray.dark2}`,
                margin: `${spacing[1]}px 0`, paddingTop: spacing[1],
                fontStyle: 'italic', color: palette.gray.light1,
              }}>
                {'>> '}Waiting for change events...
              </div>
            )}

            {events.length > 0 && (
              <>
                <div style={{
                  borderTop: `1px solid ${palette.gray.dark2}`,
                  margin: `${spacing[1]}px 0`, paddingTop: spacing[1],
                }}>
                  <span style={{ color: palette.yellow.light2 }}>
                    Recent ({events.length}):
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

          <div style={{
            marginTop: spacing[1], fontSize: 10, fontFamily: FONT,
            color: palette.green.dark2, lineHeight: 1.5,
          }}>
            <strong>Change Streams:</strong> Real-time <code style={{ fontSize: 10 }}>db.watch()</code> on
            alerts &amp; investigations. No polling, no message queue.
          </div>
        </>
      )}

      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
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
