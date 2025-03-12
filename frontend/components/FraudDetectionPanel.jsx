'use client';

import { useState } from 'react';
import TransactionForm from './TransactionForm';
import Button from '@leafygreen-ui/button';

const FraudDetectionPanel = () => {
  const [transaction, setTransaction] = useState(null);
  const [similarTransactions, setSimilarTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('vector');

  const handleTransactionCreated = (data) => {
    setTransaction(data.transaction);
    setSimilarTransactions(data.similar_transactions || []);
  };

  const renderTransactionDetails = (transaction) => {
    if (!transaction) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-4">Transaction Details</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Transaction ID</p>
            <p className="font-medium">{transaction.transaction_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Amount</p>
            <p className="font-medium">{transaction.amount} {transaction.currency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="font-medium">{transaction.location.country}</p>
            <p className="text-xs text-gray-600">{transaction.location.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Timestamp</p>
            <p className="font-medium">{new Date(transaction.timestamp).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex space-x-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Rules-Based Score</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                transaction.is_flagged_fraud ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {transaction.is_flagged_fraud ? 'Flagged' : 'Safe'}
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${transaction.is_flagged_fraud ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${(transaction.fraud_score || 0) * 100}%` }}
              ></div>
            </div>
            <p className="mt-1 text-sm text-right">{transaction.fraud_score || 0}</p>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Vector Similarity Score</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                transaction.is_flagged_fraud_similarity ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {transaction.is_flagged_fraud_similarity ? 'Flagged' : 'Safe'}
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${transaction.is_flagged_fraud_similarity ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${(transaction.similarity_fraud_score || 0) * 100}%` }}
              ></div>
            </div>
            <p className="mt-1 text-sm text-right">{transaction.similarity_fraud_score || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSimilarTransactions = () => {
    if (!similarTransactions || similarTransactions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No similar transactions found. This may be due to insufficient data or this being a unique transaction pattern.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fraud Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {similarTransactions.map((transaction) => (
              <tr key={transaction.transaction_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.transaction_id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {transaction.amount} {transaction.currency}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {transaction.location.country}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${
                    transaction.is_flagged_fraud ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {transaction.fraud_score}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transaction.is_flagged_fraud ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Flagged
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Safe
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <TransactionForm onTransactionCreated={handleTransactionCreated} />
      </div>
      
      <div>
        {transaction ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {renderTransactionDetails(transaction)}
            
            <div className="border-t border-gray-200">
              <div className="flex border-b">
                <button
                  className={`flex-1 py-3 px-4 text-center ${
                    activeTab === 'vector' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'
                  }`}
                  onClick={() => setActiveTab('vector')}
                >
                  Similar Transactions
                </button>
                <button
                  className={`flex-1 py-3 px-4 text-center ${
                    activeTab === 'rules' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'
                  }`}
                  onClick={() => setActiveTab('rules')}
                >
                  Detection Rules
                </button>
              </div>
              
              <div className="p-4">
                {activeTab === 'vector' ? (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Similar Transactions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      MongoDB's Vector Search found these similar transactions based on the 
                      vector embeddings of amount, currency, and location.
                    </p>
                    {renderSimilarTransactions()}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Fraud Detection Rules</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded">
                        <p className="font-medium">High Risk Locations</p>
                        <p className="text-sm text-gray-600">Countries: LY, HK</p>
                        <p className="text-sm text-gray-600">Weight: 0.5</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded">
                        <p className="font-medium">Amount Threshold</p>
                        <p className="text-sm text-gray-600">Threshold: $5,000</p>
                        <p className="text-sm text-gray-600">Weight: 0.3</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-bold mb-4">Fraud Detection Results</h2>
            <p className="text-gray-600 mb-6">
              Create a transaction to see fraud detection results using both 
              rules-based and vector similarity approaches.
            </p>
            <img 
              src="/mongo.png" 
              alt="MongoDB Logo" 
              className="mx-auto h-20 opacity-50"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudDetectionPanel;