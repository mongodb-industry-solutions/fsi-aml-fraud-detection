"use client";

import React, { useState } from 'react';
import { H1, H2, H3, Body, Subtitle } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import Badge from '@leafygreen-ui/badge';
import Banner from '@leafygreen-ui/banner';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import { Table, TableHead, TableBody, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import Icon from '@leafygreen-ui/icon';
import { Menu, MenuItem } from '@leafygreen-ui/menu';

import OnboardingForm from '../../components/entityResolution/OnboardingForm';
import PotentialMatchesList from '../../components/entityResolution/PotentialMatchesList';
import ResolutionWorkbench from '../../components/entityResolution/ResolutionWorkbench';

// Sample enhanced data - in real implementation, this would come from your API
const entityData = {
  primaryEntity: {
    id: "C123456",
    name: "John A. Smith",
    dateOfBirth: "1978-04-15",
    nationality: "USA",
    riskScore: 68,
    entityType: "individual",
    addresses: [
      { type: "residential", address: "123 Main St, New York, NY", primary: true },
      { type: "business", address: "456 Commerce Ave, Suite 500, New York, NY", primary: false }
    ],
    identifiers: [
      { type: "ssn", value: "***-**-1234", country: "USA" },
      { type: "passport", value: "Z123456", country: "USA" }
    ],
    createdAt: "2024-01-15T10:30:00Z",
    lastActivity: "2024-06-06T15:45:00Z"
  },
  matchedEntities: [
    {
      id: "C789012",
      name: "John Smith",
      matchScore: 87,
      matchReasons: ["similar_name", "shared_address", "similar_dob"],
      riskScore: 42,
      entityType: "individual",
      dateOfBirth: "1978-04-16",
      nationality: "USA",
      addresses: [
        { type: "residential", address: "123 Main St, New York, NY", primary: true }
      ],
      identifiers: [
        { type: "dl", value: "NY12345678", country: "USA" }
      ]
    },
    {
      id: "C345678",
      name: "Jonathan A. Smith",
      matchScore: 78,
      matchReasons: ["similar_name", "shared_identifier"],
      riskScore: 73,
      entityType: "individual",
      dateOfBirth: "1975-06-20",
      nationality: "CAN",
      addresses: [
        { type: "residential", address: "789 Park Lane, Toronto, ON", primary: true }
      ],
      identifiers: [
        { type: "ssn", value: "***-**-1234", country: "USA" }
      ]
    },
    {
      id: "C567890",
      name: "J. Adam Smith",
      matchScore: 65,
      matchReasons: ["similar_name"],
      riskScore: 35,
      entityType: "individual",
      dateOfBirth: "1980-02-10",
      nationality: "USA",
      addresses: [
        { type: "residential", address: "567 Oak Drive, Boston, MA", primary: true }
      ],
      identifiers: [
        { type: "passport", value: "Y987654", country: "USA" }
      ]
    }
  ],
  networkConnections: [
    { source: "C123456", target: "C789012", type: "potential_duplicate", confidence: 0.87 },
    { source: "C123456", target: "C345678", type: "shared_identifier", confidence: 0.78 },
    { source: "C789012", target: "C901234", type: "business_associate", confidence: 0.63 }
  ]
};

const EnhancedEntityResolutionPage = () => {
  const [activeTab, setActiveTab] = useState('matches');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [primaryEntity, setPrimaryEntity] = useState(entityData.primaryEntity);

  // Color functions based on MongoDB palette
  const getRiskColor = (score) => {
    if (score >= 75) return palette.red.base;
    if (score >= 50) return palette.yellow.base;
    if (score >= 25) return palette.blue.base;
    return palette.green.base;
  };

  const getRiskBadgeVariant = (score) => {
    if (score >= 75) return 'red';
    if (score >= 50) return 'yellow';
    if (score >= 25) return 'blue';
    return 'green';
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return palette.red.dark1;
    if (score >= 60) return palette.yellow.dark2;
    return palette.blue.dark1;
  };

  const handleEntityClick = (entity) => {
    setSelectedEntity(entity);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Implement search functionality
  };

  const renderMatchReasons = (reasons) => {
    return reasons.map((reason, index) => (
      <Badge
        key={index}
        variant="lightblue"
        style={{ marginRight: spacing[1], marginBottom: spacing[1] }}
      >
        {reason.replace(/_/g, ' ')}
      </Badge>
    ));
  };

  const renderEntityCard = (entity, title, icon) => (
    <Card style={{ marginBottom: spacing[3] }}>
      <div style={{ padding: spacing[3] }}>
        <H3 style={{ 
          color: palette.gray.dark3, 
          marginBottom: spacing[3],
          display: 'flex',
          alignItems: 'center'
        }}>
          <Icon glyph={icon} style={{ marginRight: spacing[2] }} />
          {title}
        </H3>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: spacing[3]
        }}>
          <div>
            <H2 style={{ color: palette.gray.dark3, marginBottom: spacing[1] }}>
              {entity.name}
            </H2>
            <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
              ID: {entity.id}
            </Body>
          </div>
          <Badge variant={getRiskBadgeVariant(entity.riskScore)}>
            Risk: {entity.riskScore}
          </Badge>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: spacing[2],
          marginBottom: spacing[3]
        }}>
          <div>
            <Body style={{ color: palette.gray.dark1, fontSize: '12px', fontWeight: 'bold' }}>
              Date of Birth
            </Body>
            <Body style={{ fontSize: '14px' }}>
              {entity.dateOfBirth || 'Not provided'}
            </Body>
          </div>
          <div>
            <Body style={{ color: palette.gray.dark1, fontSize: '12px', fontWeight: 'bold' }}>
              Nationality
            </Body>
            <Body style={{ fontSize: '14px' }}>
              {entity.nationality || 'Not provided'}
            </Body>
          </div>
        </div>

        <div style={{ marginBottom: spacing[3] }}>
          <Body style={{ color: palette.gray.dark1, fontSize: '12px', fontWeight: 'bold' }}>
            Addresses
          </Body>
          {entity.addresses?.map((addr, i) => (
            <div key={i} style={{ marginTop: spacing[1] }}>
              <Body style={{ fontSize: '14px' }}>
                <span style={{ color: palette.gray.dark1, fontStyle: 'italic' }}>
                  {addr.type}:
                </span> {addr.address}
              </Body>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: spacing[3] }}>
          <Body style={{ color: palette.gray.dark1, fontSize: '12px', fontWeight: 'bold' }}>
            Identifiers
          </Body>
          {entity.identifiers?.map((id, i) => (
            <div key={i} style={{ marginTop: spacing[1] }}>
              <Body style={{ fontSize: '14px' }}>
                <span style={{ color: palette.gray.dark1, fontStyle: 'italic' }}>
                  {id.type}:
                </span> {id.value} ({id.country})
              </Body>
            </div>
          ))}
        </div>

        {selectedEntity && entity.matchScore && (
          <div style={{ marginBottom: spacing[3] }}>
            <Body style={{ color: palette.gray.dark1, fontSize: '12px', fontWeight: 'bold' }}>
              Match Score
            </Body>
            <Body style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: getMatchScoreColor(entity.matchScore)
            }}>
              {entity.matchScore}% match
            </Body>
            <div style={{ marginTop: spacing[1] }}>
              {renderMatchReasons(entity.matchReasons)}
            </div>
          </div>
        )}

        {selectedEntity && (
          <div style={{ 
            display: 'flex', 
            gap: spacing[2],
            marginTop: spacing[3]
          }}>
            <Button 
              variant="primary" 
              size="small"
              leftGlyph={<Icon glyph="Checkmark" />}
            >
              Merge Entities
            </Button>
            <Button 
              variant="default" 
              size="small"
              leftGlyph={<Icon glyph="X" />}
            >
              Mark as False Match
            </Button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      backgroundColor: palette.gray.light3
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: palette.green.dark2, 
        color: palette.gray.light3,
        padding: spacing[3]
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <H1 style={{ color: palette.gray.light3, margin: 0 }}>
            🎯 Intelligent Entity Resolution - AML Dashboard
          </H1>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <div style={{ position: 'relative' }}>
              <TextInput
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ minWidth: '300px' }}
              />
              <Icon 
                glyph="MagnifyingGlass" 
                style={{ 
                  position: 'absolute', 
                  right: spacing[2], 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: palette.gray.dark1
                }}
              />
            </div>
            <Button 
              variant="default"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            >
              Advanced Search
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel - Entity details */}
        <div style={{ 
          width: '33%', 
          borderRight: `1px solid ${palette.gray.light2}`,
          backgroundColor: 'white',
          overflow: 'auto',
          padding: spacing[3]
        }}>
          {renderEntityCard(primaryEntity, "Primary Entity", "Person")}
          
          {selectedEntity && 
            renderEntityCard(selectedEntity, "Selected Match Details", "PersonWithLock")
          }
        </div>

        {/* Right panel - Tabs and content */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: palette.gray.light3,
          overflow: 'hidden'
        }}>
          {/* Tabs */}
          <Tabs 
            selected={activeTab} 
            setSelected={setActiveTab}
            style={{ backgroundColor: 'white' }}
          >
            <Tab name="matches">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: spacing[1]
              }}>
                <Icon glyph="Person" size="small" />
                Potential Matches
              </div>
            </Tab>
            
            <Tab name="network">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: spacing[1]
              }}>
                <Icon glyph="Diagram" size="small" />
                Network Graph
              </div>
            </Tab>
            
            <Tab name="activity">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: spacing[1]
              }}>
                <Icon glyph="Charts" size="small" />
                Activity Analysis
              </div>
            </Tab>
          </Tabs>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto', padding: spacing[3] }}>
            {activeTab === 'matches' && (
              <div>
                {/* Matches Table */}
                <Card style={{ marginBottom: spacing[3] }}>
                  <div style={{ 
                    padding: spacing[3], 
                    borderBottom: `1px solid ${palette.gray.light2}`
                  }}>
                    <H3 style={{ color: palette.gray.dark3, margin: 0 }}>
                      Matched Entities ({entityData.matchedEntities.length})
                    </H3>
                  </div>
                  
                  <Table>
                    <TableHead>
                      <HeaderRow>
                        <HeaderCell>ID</HeaderCell>
                        <HeaderCell>Name</HeaderCell>
                        <HeaderCell>Match Score</HeaderCell>
                        <HeaderCell>Match Reasons</HeaderCell>
                        <HeaderCell>Risk Score</HeaderCell>
                        <HeaderCell>Actions</HeaderCell>
                      </HeaderRow>
                    </TableHead>
                    <TableBody>
                      {entityData.matchedEntities.map((entity) => (
                        <Row 
                          key={entity.id}
                          onClick={() => handleEntityClick(entity)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Cell>{entity.id}</Cell>
                          <Cell style={{ fontWeight: 'bold' }}>{entity.name}</Cell>
                          <Cell>
                            <Body style={{ 
                              color: getMatchScoreColor(entity.matchScore),
                              fontWeight: 'bold'
                            }}>
                              {entity.matchScore}%
                            </Body>
                          </Cell>
                          <Cell>
                            <div style={{ 
                              display: 'flex', 
                              flexWrap: 'wrap',
                              gap: spacing[1]
                            }}>
                              {renderMatchReasons(entity.matchReasons)}
                            </div>
                          </Cell>
                          <Cell>
                            <Badge variant={getRiskBadgeVariant(entity.riskScore)}>
                              {entity.riskScore}
                            </Badge>
                          </Cell>
                          <Cell>
                            <div style={{ display: 'flex', gap: spacing[1] }}>
                              <Button variant="default" size="xsmall">View</Button>
                              <Button variant="primary" size="xsmall">Merge</Button>
                              <Button variant="default" size="xsmall">Dismiss</Button>
                            </div>
                          </Cell>
                        </Row>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {/* Match Intelligence */}
                <Card>
                  <div style={{ padding: spacing[3] }}>
                    <H3 style={{ color: palette.gray.dark3, marginBottom: spacing[3] }}>
                      🎯 Match Intelligence
                    </H3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: spacing[3]
                    }}>
                      <div style={{ 
                        border: `1px solid ${palette.gray.light2}`,
                        borderRadius: '6px',
                        padding: spacing[3]
                      }}>
                        <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                          Highest Match Confidence
                        </Body>
                        <H1 style={{ color: palette.blue.dark1, margin: `${spacing[1]} 0` }}>
                          87%
                        </H1>
                        <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                          John Smith (C789012)
                        </Body>
                      </div>
                      
                      <div style={{ 
                        border: `1px solid ${palette.gray.light2}`,
                        borderRadius: '6px',
                        padding: spacing[3]
                      }}>
                        <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                          Most Common Match Reason
                        </Body>
                        <H2 style={{ color: palette.gray.dark3, margin: `${spacing[1]} 0` }}>
                          Similar Name
                        </H2>
                        <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                          Present in 3/3 matches
                        </Body>
                      </div>
                      
                      <div style={{ 
                        border: `1px solid ${palette.gray.light2}`,
                        borderRadius: '6px',
                        padding: spacing[3]
                      }}>
                        <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                          Average Risk Score
                        </Body>
                        <H1 style={{ color: palette.yellow.base, margin: `${spacing[1]} 0` }}>
                          50
                        </H1>
                        <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                          Across all matched entities
                        </Body>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'network' && (
              <Card style={{ height: '100%' }}>
                <div style={{ padding: spacing[3] }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: spacing[3]
                  }}>
                    <H3 style={{ color: palette.gray.dark3, margin: 0 }}>
                      Entity Network Graph
                    </H3>
                    <div style={{ display: 'flex', gap: spacing[2] }}>
                      <Button variant="default" size="small">
                        Expand Network
                      </Button>
                      <select style={{ 
                        padding: `${spacing[1]} ${spacing[2]}`,
                        border: `1px solid ${palette.gray.light2}`,
                        borderRadius: '4px'
                      }}>
                        <option>All Relationships</option>
                        <option>Potential Duplicates</option>
                        <option>Business Associates</option>
                        <option>Shared Identifiers</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ 
                    height: '400px',
                    backgroundColor: palette.gray.light3,
                    borderRadius: '6px',
                    border: `1px solid ${palette.gray.light2}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <Icon glyph="Diagram" size="xlarge" fill={palette.blue.light1} />
                    <Body style={{ color: palette.gray.dark1, marginTop: spacing[2] }}>
                      Interactive network visualization would be displayed here
                    </Body>
                    <Body style={{ color: palette.gray.base, fontSize: '14px', marginTop: spacing[1] }}>
                      Connected entities: 8 | Relationships: 12
                    </Body>
                  </div>

                  <div style={{ marginTop: spacing[3] }}>
                    <Subtitle style={{ marginBottom: spacing[2] }}>Legend:</Subtitle>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap',
                      gap: spacing[3]
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%',
                          backgroundColor: palette.red.base
                        }} />
                        <Body style={{ fontSize: '14px' }}>High Risk (75+)</Body>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%',
                          backgroundColor: palette.yellow.base
                        }} />
                        <Body style={{ fontSize: '14px' }}>Medium Risk (50-74)</Body>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%',
                          backgroundColor: palette.blue.base
                        }} />
                        <Body style={{ fontSize: '14px' }}>Low Risk (25-49)</Body>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%',
                          backgroundColor: palette.green.base
                        }} />
                        <Body style={{ fontSize: '14px' }}>Minimal Risk (0-24)</Body>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'activity' && (
              <Card style={{ height: '100%' }}>
                <div style={{ padding: spacing[3] }}>
                  <H3 style={{ color: palette.gray.dark3, marginBottom: spacing[3] }}>
                    Activity Analysis
                  </H3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gap: spacing[3],
                    marginBottom: spacing[3]
                  }}>
                    <div style={{ 
                      border: `1px solid ${palette.gray.light2}`,
                      borderRadius: '6px',
                      padding: spacing[3]
                    }}>
                      <Subtitle style={{ marginBottom: spacing[2] }}>
                        Transaction Volume (Last 6 Months)
                      </Subtitle>
                      <div style={{ 
                        height: '200px',
                        backgroundColor: palette.gray.light3,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon glyph="Charts" size="large" fill={palette.blue.light1} />
                      </div>
                    </div>

                    <div style={{ 
                      border: `1px solid ${palette.gray.light2}`,
                      borderRadius: '6px',
                      padding: spacing[3]
                    }}>
                      <Subtitle style={{ marginBottom: spacing[2] }}>
                        Transaction Patterns
                      </Subtitle>
                      <div style={{ 
                        height: '200px',
                        backgroundColor: palette.gray.light3,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon glyph="Charts" size="large" fill={palette.blue.light1} />
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    border: `1px solid ${palette.gray.light2}`,
                    borderRadius: '6px',
                    padding: spacing[3]
                  }}>
                    <Subtitle style={{ marginBottom: spacing[2] }}>
                      Recent High-Risk Transactions
                    </Subtitle>
                    <Table>
                      <TableHead>
                        <HeaderRow>
                          <HeaderCell>Date</HeaderCell>
                          <HeaderCell>Amount</HeaderCell>
                          <HeaderCell>Type</HeaderCell>
                          <HeaderCell>Destination</HeaderCell>
                          <HeaderCell>Risk Flags</HeaderCell>
                        </HeaderRow>
                      </TableHead>
                      <TableBody>
                        <Row>
                          <Cell>2024-03-15</Cell>
                          <Cell style={{ fontWeight: 'bold' }}>$15,000.00</Cell>
                          <Cell>Wire Transfer</Cell>
                          <Cell>Bank XYZ, Cyprus</Cell>
                          <Cell>
                            <div style={{ display: 'flex', gap: spacing[1] }}>
                              <Badge variant="red">Large Amount</Badge>
                              <Badge variant="red">High-Risk Country</Badge>
                            </div>
                          </Cell>
                        </Row>
                        <Row>
                          <Cell>2024-03-10</Cell>
                          <Cell style={{ fontWeight: 'bold' }}>$8,750.00</Cell>
                          <Cell>ACH Transfer</Cell>
                          <Cell>Global Trading Inc</Cell>
                          <Cell>
                            <Badge variant="yellow">Unusual Pattern</Badge>
                          </Cell>
                        </Row>
                        <Row>
                          <Cell>2024-02-28</Cell>
                          <Cell style={{ fontWeight: 'bold' }}>$12,300.00</Cell>
                          <Cell>Wire Transfer</Cell>
                          <Cell>Acme Corp Ltd</Cell>
                          <Cell>
                            <div style={{ display: 'flex', gap: spacing[1] }}>
                              <Badge variant="red">PEP-associated</Badge>
                              <Badge variant="yellow">Velocity Alert</Badge>
                            </div>
                          </Cell>
                        </Row>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedEntityResolutionPage;