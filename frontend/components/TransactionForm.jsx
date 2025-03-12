'use client';

import { useState } from 'react';
import Button from '@leafygreen-ui/button';

const TransactionForm = ({ onTransactionCreated }) => {
  const [formData, setFormData] = useState({
    amount: 1000,
    currency: 'USD',
    location: 'US'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? parseFloat(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error creating transaction');
      }

      const data = await response.json();
      if (onTransactionCreated) {
        onTransactionCreated(data);
      }
      
      // Reset form (optional)
      // setFormData({
      //   amount: 1000,
      //   currency: 'USD',
      //   location: 'US'
      // });
    } catch (err) {
      setError(err.message);
      console.error('Error creating transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Create New Transaction</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Amount:
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            min="0"
            step="0.01"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Currency:
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Location:
          </label>
          <select
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="LY">Libya (High Risk)</option>
            <option value="HK">Hong Kong (High Risk)</option>
          </select>
        </div>
        
        <Button
          variant="primary"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Create Transaction'}
        </Button>
      </form>
    </div>
  );
};

export default TransactionForm;