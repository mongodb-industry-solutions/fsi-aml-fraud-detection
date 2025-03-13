"use client";

import TransactionSimulator from "./TransactionSimulator";

export default function TransactionSimulatorWrapper() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <TransactionSimulator />
    </div>
  );
}