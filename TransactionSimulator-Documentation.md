# Transaction Simulator Component Documentation

## Overview

The Transaction Simulator is a key component of the ThreatSight 360 fraud detection system. It allows users to simulate various transaction scenarios with different risk profiles to test and demonstrate the fraud detection capabilities of the system. The component is built using MongoDB's LeafyGreen UI component library and follows MongoDB's design patterns.

## Architecture

### Component Structure

- **TransactionSimulator.jsx**: Main component file with all the logic and UI
- **TransactionSimulator.module.css**: CSS module for custom styling
- **transaction-simulator/page.js**: Next.js page that hosts the component
- **transaction-simulator/layout.js**: Layout file for the page

### Integration Points

- Connects to the backend fraud detection API at `/transactions/evaluate` and `/transactions`
- Uses customer data from the `/customers` endpoint
- Relies on the fraud detection service for risk assessment

## Features

### 1. Customer Selection

- Dropdown to select from available customers
- Display of key customer profile information:
  - Email address
  - Account number
  - Risk score
  - Average transaction amount

### 2. Scenario Selection

Pre-configured scenarios to simulate different fraud patterns:

- **Normal Transaction**: A typical transaction within customer's normal patterns
- **Unusual Amount**: Transaction with an amount significantly higher than average
- **Unusual Location**: Transaction from a location far from usual activity areas
- **New Device**: Transaction from a device not previously used by the customer
- **Multiple Red Flags**: Combines multiple anomalous factors

### 3. Transaction Customization

Detailed control over all transaction parameters:

- **Transaction Type**: Purchase, withdrawal, transfer, or deposit
- **Payment Method**: Credit card, debit card, bank transfer, or digital wallet
- **Amount**: With reference to customer's average spending
- **Merchant Category**: With highlighting of customer's common categories
- **Merchant Name**: Optional custom name (auto-generated if empty)
- **Location**: Toggle between using customer's common location or a custom one
- **Device**: Toggle between using a known device or a new one

### 4. Transaction Submission and Results

Two submission options:

- **Evaluate Transaction**: Perform fraud detection without storing the transaction
- **Submit & Store Transaction**: Evaluate and store the transaction in the database

Results display in a modal window:

- Overall risk assessment with color-coded status
- Risk score visualization
- List of detected risk factors with explanations
- Detailed transaction information
- Option to save evaluation results

## Implementation Details

### State Management

The component uses React's useState hooks to manage:

- Customer selection
- Scenario parameters
- Transaction fields
- API loading states
- Result data

### API Integration

- Uses Axios for API requests
- Handles loading and error states
- Formats transaction data according to API specifications

### Responsive Design

- Flexible layout with responsive cards
- Mobile-friendly UI elements
- Adaptive spacing and sizing

### UX Considerations

- Loading indicators during API calls
- Error messages for failed operations
- Tooltips for additional information
- Color-coded risk levels (green=low, yellow=medium, red=high)
- Automatic field population based on customer data

## LeafyGreen UI Integration

The component uses the following LeafyGreen UI components:

- **Card**: For section containers
- **Button**: For actions
- **Select**: For dropdown menus
- **Toggle**: For boolean options
- **Banner**: For notifications and warnings
- **Table**: For detailed data display
- **Typography**: For consistent text styling
- **Tabs**: For organizing result information
- **Tooltip**: For contextual help
- **Icon**: For visual indicators
- **TextInput**: For text fields
- **RadioGroup**: For scenario selection
- **Modal**: For results display
- **LoadingIndicator**: For loading states
- **Callout**: For highlighted information

## Usage Workflow

1. **Select a Customer**: Choose a customer profile from the dropdown
2. **Choose a Scenario**: Select a predefined scenario or customize your own
3. **Adjust Transaction Details**: Modify any transaction parameters as needed
4. **Submit Transaction**: Click either "Evaluate Transaction" or "Submit & Store Transaction"
5. **Review Results**: Analyze the risk assessment in the results modal
6. **Save or Close**: Choose to save the transaction or close the modal

## Future Enhancements

Potential improvements for future versions:

1. Integration with MongoDB Charts for transaction history visualization
2. Batch simulation capability for multiple transactions
3. Save and replay functionality for specific scenarios
4. More detailed explanations of risk factors
5. Comparison view between different transaction scenarios
6. Export results functionality