import { palette } from '@leafygreen-ui/palette';

export const uiTokens = {
  railBg: '#FAFBFA',
  surface1: '#fff',
  borderDefault: palette.gray.light2,
  borderStrong: palette.gray.light1,
  shadowHover: '0 4px 12px rgba(20, 23, 26, 0.06)',
  shadowSelected: '0 8px 24px rgba(0, 104, 74, 0.08)',
  shadowCard: '0 1px 3px rgba(0, 0, 0, 0.04)',
  shadowElevated: '0 4px 16px rgba(0, 0, 0, 0.06)',
  transitionFast: '150ms cubic-bezier(0.33, 1, 0.68, 1)',
  transitionMedium: '220ms cubic-bezier(0.33, 1, 0.68, 1)',
  font: "'Euclid Circular A', sans-serif",
  monoFont: "'Source Code Pro', monospace",
};

export function getRiskAccentColor(score) {
  if (score == null) return palette.gray.light1;
  if (score >= 75) return palette.red.base;
  if (score >= 50) return '#ed6c02';
  if (score >= 25) return palette.yellow.base;
  return palette.green.base;
}

export const GLOBAL_KEYFRAMES = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerBar {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes attentionPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0); }
    50% { box-shadow: 0 0 0 4px rgba(255, 214, 0, 0.2); }
  }
  @keyframes subtlePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.65; }
  }
  @keyframes dotPulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(0,99,235,0.15); }
    50% { box-shadow: 0 0 0 6px rgba(0,99,235,0.08); }
  }
  @keyframes nodePulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(0,99,235,0.2), 0 3px 12px rgba(0,0,0,0.1); }
    50% { box-shadow: 0 0 0 4px rgba(0,99,235,0.1), 0 3px 12px rgba(0,0,0,0.1); }
  }
  @keyframes shimmerText {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
