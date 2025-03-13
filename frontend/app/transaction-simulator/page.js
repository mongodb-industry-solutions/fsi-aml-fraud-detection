import TransactionSimulatorWrapper from "@/components/transactionSimulator/TransactionSimulatorWrapper";

export const metadata = {
  title: 'ThreatSight 360 - Transaction Simulator',
  description: 'Simulate and detect fraudulent transactions with ThreatSight 360',
};

export default function TransactionSimulatorPage() {
  return <TransactionSimulatorWrapper />;
}