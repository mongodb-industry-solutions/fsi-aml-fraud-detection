import React, { useState, useEffect } from 'react';
import Card from '@leafygreen-ui/card';
import { H3, Body, Subtitle } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { Table, TableHead, TableBody, Row as TableRow, Cell as TableCell } from '@leafygreen-ui/table';
import Icon from '@leafygreen-ui/icon';
import { amlAPI } from '@/lib/aml-api';

const TransactionActivityTable = ({ entityId, onError }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0
  });

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const skip = (page - 1) * pagination.pageSize;
      
      const response = await amlAPI.getEntityTransactions(entityId, {
        limit: pagination.pageSize,
        skip: skip
      });
      
      setTransactions(response.transactions || []);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalCount: response.total_count || 0
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchTransactions(1);
    }
  }, [entityId]);

  const handlePageChange = (page) => {
    fetchTransactions(page);
  };

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getDirectionBadge = (direction) => {
    return direction === 'sent' ? (
      <Badge variant="blue">📤 Sent</Badge>
    ) : (
      <Badge variant="green">📥 Received</Badge>
    );
  };

  const getRiskBadge = (riskScore, flagged) => {
    if (flagged) {
      return <Badge variant="red">🚩 {riskScore}</Badge>;
    }
    
    if (riskScore >= 60) return <Badge variant="red">{riskScore}</Badge>;
    if (riskScore >= 40) return <Badge variant="yellow">{riskScore}</Badge>;
    if (riskScore >= 20) return <Badge variant="green">{riskScore}</Badge>;
    return <Badge variant="gray">{riskScore}</Badge>;
  };

  const getTransactionTypeBadge = (type) => {
    const typeMap = {
      'consulting_fee': { variant: 'purple', text: 'Consulting Fee' },
      'investment_transfer': { variant: 'blue', text: 'Investment Transfer' },
      'wire_transfer': { variant: 'gray', text: 'Wire Transfer' },
      'payment': { variant: 'green', text: 'Payment' }
    };
    
    const config = typeMap[type] || { variant: 'gray', text: type?.replace(/_/g, ' ') || 'Unknown' };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getStatusBadge = (status) => {
    return status === 'completed' ? (
      <Badge variant="green">✅ Completed</Badge>
    ) : (
      <Badge variant="yellow">⏳ Pending</Badge>
    );
  };

  const formatTags = (tags) => {
    if (!tags || tags.length === 0) return <Subtitle style={{ fontSize: '11px', color: '#999' }}>-</Subtitle>;
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2px'
      }}>
        {tags.slice(0, 2).map((tag, index) => (
          <Badge 
            key={index} 
            variant="gray" 
            style={{ 
              fontSize: '9px', 
              padding: '2px 6px',
              whiteSpace: 'nowrap'
            }}
          >
            {tag.replace(/_/g, ' ')}
          </Badge>
        ))}
        {tags.length > 2 && (
          <Badge 
            variant="gray" 
            style={{ 
              fontSize: '9px', 
              padding: '2px 6px',
              whiteSpace: 'nowrap'
            }}
          >
            +{tags.length - 2} more
          </Badge>
        )}
      </div>
    );
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

  if (loading && transactions.length === 0) {
    return (
      <Card style={{ padding: '24px', textAlign: 'center' }}>
        <Spinner size="large" />
        <Body style={{ marginTop: '16px' }}>Loading transaction activity...</Body>
      </Card>
    );
  }

  return (
    <Card style={{ 
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      overflow: 'hidden', // Prevent card expansion
      marginBottom: '24px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        width: '100%',
        maxWidth: '100%'
      }}>
        <H3>Transaction Activity</H3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Body>
            {pagination.totalCount} total transactions
          </Body>
          {loading && <Spinner size="small" />}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <Body>No transactions found for this entity.</Body>
        </div>
      ) : (
        <>
          <div style={{ 
            overflowX: 'auto',
            width: '100%',
            maxWidth: '100%'
          }}>
            <Table style={{ 
              width: '100%',
              maxWidth: '100%',
              tableLayout: 'fixed' // Use fixed layout for consistent sizing
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Direction</TableCell>
                  <TableCell>Counterparty</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.transaction_id}>
                  <TableCell>
                    {getDirectionBadge(transaction.direction)}
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <Body weight="medium" style={{ marginBottom: '2px' }}>
                        {transaction.counterparty_name}
                      </Body>
                      <Subtitle style={{ fontSize: '11px', color: '#666' }}>
                        {transaction.counterparty_type}
                      </Subtitle>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <Body weight="medium" style={{ marginBottom: '2px' }}>
                        {formatAmount(transaction.amount, transaction.currency)}
                      </Body>
                      <Subtitle style={{ fontSize: '11px', color: '#666' }}>
                        via {transaction.payment_method}
                      </Subtitle>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <Body style={{ fontSize: '13px' }}>
                        {formatDate(transaction.timestamp)}
                      </Body>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getRiskBadge(transaction.risk_score, transaction.flagged)}
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(transaction.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '16px',
              padding: '16px 0'
            }}>
              <Body>
                Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} transactions
              </Body>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Button 
                  variant="default" 
                  disabled={pagination.currentPage <= 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  leftGlyph={<Icon glyph="ArrowLeft" />}
                >
                  Previous
                </Button>
                
                <Body style={{ minWidth: '80px', textAlign: 'center' }}>
                  Page {pagination.currentPage} of {totalPages}
                </Body>
                
                <Button 
                  variant="default"
                  disabled={pagination.currentPage >= totalPages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  rightGlyph={<Icon glyph="ArrowRight" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default TransactionActivityTable;