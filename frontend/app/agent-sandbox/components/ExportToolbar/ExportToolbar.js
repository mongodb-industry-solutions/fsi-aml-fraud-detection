'use client';

import React, { useState } from 'react';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import TextInput from '@leafygreen-ui/text-input';
import { Menu, MenuItem } from '@leafygreen-ui/menu';
import Modal from '@leafygreen-ui/modal';

import { 
  generatePDFReport, 
  exportToCSV, 
  exportConfiguration,
  exportTimelineData,
  exportMemoryAnalytics,
  exportDebugSession
} from '../../utils/exportUtils';

const ExportToolbar = ({ 
  activeView, 
  data, 
  onSearch,
  searchTerm,
  setSearchTerm
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [exportType, setExportType] = useState('pdf');

  const handleExport = async (type) => {
    setIsExporting(true);
    setExportResult(null);
    
    try {
      let result;
      
      switch (type) {
        case 'pdf':
          result = await generatePDFReport(data, 'comprehensive');
          break;
        case 'csv':
          result = exportToCSV(data, `${activeView}-data`);
          break;
        case 'config':
          result = exportConfiguration(data);
          break;
        case 'timeline':
          result = exportTimelineData(data.timelineEvents || [], 'json');
          break;
        case 'memory':
          result = exportMemoryAnalytics(data.memoryData || {});
          break;
        case 'debug':
          result = exportDebugSession(data.debugMessages || [], data);
          break;
        default:
          throw new Error('Unknown export type');
      }
      
      setExportResult({ success: true, filename: result.filename, type });
    } catch (error) {
      setExportResult({ success: false, error: error.message, type });
    } finally {
      setIsExporting(false);
    }
  };

  const getExportOptions = () => {
    const baseOptions = [
      { label: 'PDF Report', value: 'pdf', icon: '📄' },
      { label: 'CSV Data', value: 'csv', icon: '📊' },
      { label: 'Configuration', value: 'config', icon: '⚙️' }
    ];

    switch (activeView) {
      case 'timeline':
        return [...baseOptions, { label: 'Timeline Data', value: 'timeline', icon: '⏱️' }];
      case 'memory':
        return [...baseOptions, { label: 'Memory Analytics', value: 'memory', icon: '🧠' }];
      case 'debug':
        return [...baseOptions, { label: 'Debug Session', value: 'debug', icon: '🔍' }];
      default:
        return baseOptions;
    }
  };

  const getActiveViewLabel = () => {
    const labels = {
      orchestration: 'Orchestration',
      memory: 'Memory Architecture',
      metrics: 'Performance Metrics',
      timeline: 'Timeline Analysis',
      debug: 'Interactive Debug'
    };
    return labels[activeView] || 'Agent Sandbox';
  };

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing[3],
        background: palette.white,
        borderRadius: '8px',
        border: `1px solid ${palette.gray.light2}`,
        marginBottom: spacing[3],
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Left side - Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], flex: 1 }}>
          <TextInput
            label=""
            placeholder={`Search ${getActiveViewLabel().toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearch && onSearch(e.target.value);
            }}
            style={{ width: '300px' }}
            leftGlyph={<Icon glyph="MagnifyingGlass" />}
          />
          
          {searchTerm && (
            <Badge variant="blue" size="small">
              Filtered
            </Badge>
          )}
        </div>

        {/* Center - Active View */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: spacing[2],
          padding: `${spacing[1]}px ${spacing[2]}px`,
          background: palette.blue.light3,
          borderRadius: '12px'
        }}>
          <Body style={{
            fontSize: '12px',
            color: palette.blue.dark2,
            margin: 0,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {getActiveViewLabel()}
          </Body>
        </div>

        {/* Right side - Export Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Menu
            trigger={
              <Button
                variant="default"
                size="small"
                leftGlyph={<Icon glyph="Download" />}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            }
            open={false}
          >
            {getExportOptions().map(option => (
              <MenuItem
                key={option.value}
                onClick={() => {
                  setExportType(option.value);
                  setShowExportModal(true);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <span style={{ fontSize: '14px' }}>{option.icon}</span>
                  <Body style={{ fontSize: '13px', margin: 0 }}>
                    {option.label}
                  </Body>
                </div>
              </MenuItem>
            ))}
          </Menu>

          <Button
            variant="default"
            size="small"
            leftGlyph={<Icon glyph="Refresh" />}
            onClick={() => {
              setSearchTerm('');
              onSearch && onSearch('');
            }}
          >
            Reset
          </Button>

          {/* Quick Export Buttons */}
          <Button
            variant="primary"
            size="small"
            leftGlyph={<Icon glyph="Download" />}
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            PDF
          </Button>

          <Button
            variant="default"
            size="small"
            leftGlyph={<Icon glyph="Charts" />}
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            CSV
          </Button>
        </div>
      </div>

      {/* Export Confirmation Modal */}
      <Modal
        open={showExportModal}
        setOpen={setShowExportModal}
        size="small"
      >
        <div style={{ padding: spacing[4] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
            marginBottom: spacing[3]
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: palette.blue.light3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📤
            </div>
            <div>
              <Body style={{
                fontSize: '16px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Export {getActiveViewLabel()} Data
              </Body>
              <Body style={{
                fontSize: '13px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                {getExportOptions().find(opt => opt.value === exportType)?.label}
              </Body>
            </div>
          </div>

          <Body style={{
            fontSize: '13px',
            color: palette.gray.dark1,
            marginBottom: spacing[4],
            margin: 0
          }}>
            This will download a file containing the current {activeView} data including metrics, 
            configurations, and analysis results. The export will include all visible data 
            {searchTerm ? ` filtered by "${searchTerm}"` : ''}.
          </Body>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: spacing[2]
          }}>
            <Button
              variant="default"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                handleExport(exportType);
                setShowExportModal(false);
              }}
              disabled={isExporting}
              leftGlyph={<Icon glyph="Download" />}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Success/Error Toast */}
      {exportResult && (
        <div style={{
          position: 'fixed',
          top: spacing[4],
          right: spacing[4],
          zIndex: 1000,
          padding: spacing[3],
          background: exportResult.success ? palette.green.light3 : palette.red.light3,
          border: `1px solid ${exportResult.success ? palette.green.light2 : palette.red.light2}`,
          borderRadius: '8px',
          maxWidth: '300px',
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: spacing[1]
          }}>
            <span style={{ fontSize: '16px' }}>
              {exportResult.success ? '✅' : '❌'}
            </span>
            <Body style={{
              fontSize: '14px',
              fontWeight: 600,
              color: exportResult.success ? palette.green.dark2 : palette.red.dark2,
              margin: 0
            }}>
              {exportResult.success ? 'Export Successful' : 'Export Failed'}
            </Body>
          </div>
          
          <Body style={{
            fontSize: '12px',
            color: palette.gray.dark1,
            margin: 0
          }}>
            {exportResult.success ? 
              `Downloaded: ${exportResult.filename}` : 
              `Error: ${exportResult.error}`
            }
          </Body>

          <Button
            variant="default"
            size="xsmall"
            onClick={() => setExportResult(null)}
            style={{
              position: 'absolute',
              top: spacing[1],
              right: spacing[1]
            }}
          >
            ×
          </Button>
        </div>
      )}

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default ExportToolbar;