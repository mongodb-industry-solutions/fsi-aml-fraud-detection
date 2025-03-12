import FraudDetectionPanel from '@/components/FraudDetectionPanel';
import TransactionList from '@/components/TransactionList';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MongoDB Fraud Detection</h1>
          <p className="text-gray-600">
            Demonstrating real-time fraud detection using MongoDB Atlas Vector Search capabilities
          </p>
        </header>
        
        <section className="mb-12">
          <FraudDetectionPanel />
        </section>
        
        <section>
          <TransactionList />
        </section>
      </div>
    </main>
  );
}
