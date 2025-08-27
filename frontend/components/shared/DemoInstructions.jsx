'use client';

import React from 'react';
import { H2, Body } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';

const DemoInstructions = ({ 
  title = "🎪 Try the Demo!",
  instructions = [
    {
      title: "Perfect Match Demo:",
      description: "Click \"Load Demo Data\" to see exact entity matching with Samantha Miller."
    },
    {
      title: "Fuzzy Matching Demo:",
      description: "Click \"Fuzzy Match Demo\" to see how \"Samantha X. Miller\" finds similar entities."
    },
    {
      title: "Enhanced View Features:",
      description: "You should see 2-4 matches including \"Sam Brittany Miller\" as a potential duplicate."
    }
  ],
  style = {}
}) => {
  return (
    <Card
      style={{
        padding: spacing[4],
        background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)',
        border: `1px solid ${palette.blue.light1}`,
        ...style,
      }}
    >
      <H2
        style={{
          color: palette.blue.dark1,
          marginBottom: spacing[3],
          textAlign: 'center',
        }}
      >
        {title}
      </H2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: spacing[3],
        }}
      >
        {instructions.map((instruction, index) => (
          <div key={index}>
            <Body
              style={{
                fontWeight: 'bold',
                color: palette.blue.dark2,
                marginBottom: spacing[1],
              }}
            >
              {instruction.title}
            </Body>
            <Body
              style={{
                color: palette.gray.dark1,
                fontSize: '14px',
              }}
            >
              {instruction.description}
            </Body>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DemoInstructions;