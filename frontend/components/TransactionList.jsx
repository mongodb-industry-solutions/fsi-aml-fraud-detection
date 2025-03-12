'use client';

import { useState, useEffect } from 'react';
import Button from '@leafygreen-ui/button';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingSamples, setGeneratingSamples] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      // Ensure data is always an array
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error loading transactions: ' + err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const generateSampleTransactions = async () => {
    setGeneratingSamples(true);
    setError(null); // Clear previous errors
    
    try {
      console.log('Frontend Component: Sending request to generate sample transactions');
      
      const sampleCount = 10;
      console.log(`Requesting ${sampleCount} sample transactions...`);
      
      const response = await fetch('/api/generate-samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: sampleCount }),
      });

      console.log(`Received response with status: ${response.status}`);

      if (!response.ok) {
        // Try to get detailed error message from response
        let errorMsg = 'Failed to generate sample transactions';
        
        // Get raw response
        const responseText = await response.text();
        console.error(`Error response body: ${responseText}`);
        
        try {
          if (responseText) {
            const errorData = JSON.parse(responseText);
            console.log('Parsed error data:', errorData);
            
            if (errorData && errorData.error) {
              errorMsg = errorData.error;
              console.error(`Error details: ${errorMsg}`);
            }
          }
        } catch (jsonErr) {
          console.error(`Could not parse error response: ${jsonErr.message}`);
          // If parsing fails, use the raw text
          if (responseText) {
            errorMsg = `Server error: ${responseText.substring(0, 100)}...`;
          }
        }
        
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      if (!Array.isArray(result)) {
        console.error(`Expected array response, got:`, result);
        throw new Error('Unexpected response format from server');
      }
      
      console.log(`Successfully generated ${result.length} transactions`);
      
      if (result.length === 0) {
        setError('No transactions were generated. Check server logs for details.');
      } else {
        // Refresh the transaction list
        await fetchTransactions();
      }
    } catch (err) {
      const errorMessage = `Error generating samples: ${err.message}`;
      setError(errorMessage);
      console.error(errorMessage, err);
    } finally {
      setGeneratingSamples(false);
    }
  };

  if (loading && transactions.length === 0) {
    return <div className="text-center py-10">Loading transactions...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-bold">Transaction History</h2>
        <Button
          variant="primary"
          onClick={generateSampleTransactions}
          disabled={generatingSamples}
        >
          {generatingSamples ? 'Generating...' : 'Generate Sample Data'}
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No transactions found. Generate sample data or create a new transaction.
        </div>
      ) : (
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
                  Rules Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vector Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
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
                    <div className="text-xs text-gray-500">
                      {transaction.location.address.substring(0, 20)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.is_flagged_fraud ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.fraud_score || '0.00'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.is_flagged_fraud_similarity ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.similarity_fraud_score || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.is_flagged_fraud || transaction.is_flagged_fraud_similarity ? (
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
      )}
    </div>
  );
};

export default TransactionList;