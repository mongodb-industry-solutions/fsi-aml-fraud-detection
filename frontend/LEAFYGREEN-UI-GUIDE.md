# LeafyGreen UI Components Guide

This document provides a comprehensive reference for MongoDB's LeafyGreen UI components used throughout the ThreatSight 360 frontend application.

## Table of Contents
- [Core Components](#core-components)
- [Typography](#typography)
- [Containers & Layout](#containers--layout)
- [Inputs & Forms](#inputs--forms)
- [Navigation & Tabs](#navigation--tabs)
- [Data Display](#data-display)
- [Feedback & Indicators](#feedback--indicators)
- [Color System](#color-system)
- [Spacing](#spacing)

## Core Components

### Button
```jsx
import Button from '@leafygreen-ui/button';

// Primary button (green)
<Button variant="primary">Submit</Button>

// Default button
<Button variant="default">Cancel</Button>

// With icon
<Button leftGlyph={<Icon glyph="Plus" />}>Add New</Button>

// Disabled button
<Button disabled={true}>Disabled</Button>
```

### Icon
```jsx
import Icon from '@leafygreen-ui/icon';

// Basic icon
<Icon glyph="Bell" />

// With custom color
<Icon glyph="Checkmark" fill={palette.green.base} />

// With custom size
<Icon glyph="Warning" size="large" />
```

### IconButton
```jsx
import IconButton from '@leafygreen-ui/icon-button';

// Icon-only button with tooltip
<IconButton aria-label="Refresh data">
  <Icon glyph="Refresh" />
</IconButton>
```

## Typography

```jsx
import {
  H1, H2, H3,
  Subtitle,
  Body,
  InlineCode,
  InlineKeyCode,
  Disclaimer,
  Error,
  Label,
  Description,
  BackLink
} from '@leafygreen-ui/typography';

// Headings
<H1>Main Heading</H1>
<H2>Section Heading</H2>
<H3>Subsection Heading</H3>

// Subtitle (smaller than H3)
<Subtitle>Smaller heading for subsections</Subtitle>

// Regular body text
<Body>Standard text content</Body>

// Weights and sizes
<Body weight="medium">Medium weight text</Body>
<Body size="small">Smaller text</Body>

// Special text elements
<InlineCode>Code snippet</InlineCode>
<InlineKeyCode>Keyboard key</InlineKeyCode>
<Disclaimer>Fine-print or disclaimer text</Disclaimer>
<Error>Error message</Error>

// Form labels and descriptions
<Label htmlFor="input-id">Input Label</Label>
<Description>Additional description text</Description>

// Navigation link
<BackLink href="/">Back to Home</BackLink>
```

## Containers & Layout

### Card
```jsx
import Card from '@leafygreen-ui/card';

// Basic card
<Card>Content here</Card>

// With custom padding
<Card style={{ padding: spacing[4] }}>Content with padding</Card>

// With header and footer sections
<Card>
  <div style={{ borderBottom: `1px solid ${palette.gray.light2}`, padding: spacing[3] }}>
    <H3>Card Header</H3>
  </div>
  <div style={{ padding: spacing[3] }}>
    <Body>Card content</Body>
  </div>
  <div style={{ borderTop: `1px solid ${palette.gray.light2}`, padding: spacing[3] }}>
    Footer actions
  </div>
</Card>
```

### ExpandableCard
```jsx
import ExpandableCard from '@leafygreen-ui/expandable-card';

// Expandable card that collapses/expands
<ExpandableCard
  title="MongoDB Document"
  defaultOpen={false}
  onClick={() => setShowContent(!showContent)}
>
  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
    <Code language="json" copyable={true}>
      {JSON.stringify(data, null, 2)}
    </Code>
  </div>
</ExpandableCard>
```

### Popover
```jsx
import Popover from '@leafygreen-ui/popover';

// Popover that appears on trigger
<Popover
  active={isOpen}
  refEl={triggerRef}
  usePortal={true}
>
  <div style={{ padding: spacing[3] }}>
    <Body>Popover content</Body>
  </div>
</Popover>
```

## Inputs & Forms

### TextInput
```jsx
import TextInput, { State, SizeVariant, TextInputType } from '@leafygreen-ui/text-input';

// Basic text input
<TextInput
  label="Username"
  placeholder="Enter username"
  onChange={(e) => setUsername(e.target.value)}
  value={username}
/>

// Input types
<TextInput type={TextInputType.Text} />
<TextInput type={TextInputType.Number} />
<TextInput type={TextInputType.Password} />

// Input states
<TextInput state={State.Error} errorMessage="This field is required" />
<TextInput state={State.Valid} />

// Sizes
<TextInput sizeVariant={SizeVariant.Default} />
<TextInput sizeVariant={SizeVariant.Small} />
<TextInput sizeVariant={SizeVariant.Large} />
```

### Select
```jsx
import { Select, Option } from '@leafygreen-ui/select';

// Basic select dropdown
<Select
  label="Customer"
  placeholder="Select a customer"
  onChange={handleCustomerChange}
  value={selectedCustomer?._id}
>
  {customers.map(customer => (
    <Option key={customer._id} value={customer._id}>
      {customer.personal_info.name}
    </Option>
  ))}
</Select>

// Multi-select
<Select
  label="Categories"
  placeholder="Select categories"
  onChange={handleCategoryChange}
  value={selectedCategories}
  allowDeselect={true}
  multiselect={true}
>
  {categories.map(category => (
    <Option key={category.id} value={category.id}>
      {category.name}
    </Option>
  ))}
</Select>
```

### Toggle
```jsx
import Toggle from '@leafygreen-ui/toggle';

// Toggle switch
<Toggle
  onChange={() => setEnabled(!enabled)}
  checked={enabled}
  size="default" // or "small"
  label="Enable feature"
  aria-label="Enable feature"
/>
```

### RadioGroup
```jsx
import { RadioGroup, Radio } from '@leafygreen-ui/radio-group';

// Radio button group
<RadioGroup
  onChange={(e) => setSelectedOption(e.target.value)}
  value={selectedOption}
  name="options"
>
  <Radio value="option1" id="option1">Option 1</Radio>
  <Radio value="option2" id="option2">Option 2</Radio>
  <Radio value="option3" id="option3" disabled>Option 3 (Disabled)</Radio>
</RadioGroup>
```

### RadioBoxGroup
```jsx
import RadioBox from '@leafygreen-ui/radio-box-group';

// Radio boxes with more complex content
<RadioBox
  name="scenario"
  value={selectedScenario}
  onChange={(e) => setSelectedScenario(e.target.value)}
>
  <RadioBox.RadioBox
    value="normal"
    id="normal"
    className={styles.radioBox}
  >
    <div>
      <H3>Normal Transaction</H3>
      <Body>Standard transaction within expected patterns</Body>
    </div>
  </RadioBox.RadioBox>
  
  <RadioBox.RadioBox
    value="anomaly"
    id="anomaly"
    className={styles.radioBox}
  >
    <div>
      <H3>Anomalous Transaction</H3>
      <Body>Transaction outside normal patterns</Body>
    </div>
  </RadioBox.RadioBox>
</RadioBox>
```

## Navigation & Tabs

### Tabs
```jsx
import { Tabs, Tab } from '@leafygreen-ui/tabs';

// Basic tabs
<Tabs
  selected={activeTab}
  setSelected={setActiveTab}
  aria-label="Content tabs"
>
  <Tab name="Overview">
    <div style={{ marginTop: spacing[3] }}>
      <Card>Overview content</Card>
    </div>
  </Tab>
  
  <Tab name="Details">
    <div style={{ marginTop: spacing[3] }}>
      <Card>Details content</Card>
    </div>
  </Tab>
  
  <Tab name="History">
    <div style={{ marginTop: spacing[3] }}>
      <Card>History content</Card>
    </div>
  </Tab>
</Tabs>
```

### Menu
```jsx
import { Menu, MenuItem } from '@leafygreen-ui/menu';

// Dropdown menu
<Menu
  open={menuOpen}
  setOpen={setMenuOpen}
  trigger={<Button>Actions</Button>}
>
  <MenuItem onClick={handleEdit}>Edit</MenuItem>
  <MenuItem onClick={handleDelete}>Delete</MenuItem>
  <MenuItem href="/details">View Details</MenuItem>
  <MenuItem disabled>Disabled Action</MenuItem>
</Menu>
```

## Data Display

### Table
```jsx
import {
  Table,
  TableBody,
  TableHead,
  HeaderRow,
  HeaderCell,
  Row,
  Cell,
  useLeafyGreenTable,
  flexRender
} from '@leafygreen-ui/table';

// Basic table
<Table
  data={transactions}
  columns={columns}
>
  <TableHead>
    <HeaderRow>
      <HeaderCell>Date</HeaderCell>
      <HeaderCell>Customer</HeaderCell>
      <HeaderCell>Amount</HeaderCell>
      <HeaderCell>Status</HeaderCell>
    </HeaderRow>
  </TableHead>
  <TableBody>
    {transactions.map((transaction) => (
      <Row key={transaction._id}>
        <Cell>{new Date(transaction.timestamp).toLocaleDateString()}</Cell>
        <Cell>{transaction.customer_name}</Cell>
        <Cell>${transaction.amount.toFixed(2)}</Cell>
        <Cell>{transaction.status}</Cell>
      </Row>
    ))}
  </TableBody>
</Table>

// With sorting and pagination (using useLeafyGreenTable hook)
const table = useLeafyGreenTable({
  columns,
  data,
  initialState: {
    sorting: [{ id: 'date', desc: true }],
  },
});

<Table>
  <TableHead>
    {table.getHeaderGroups().map(headerGroup => (
      <HeaderRow key={headerGroup.id}>
        {headerGroup.headers.map(header => (
          <HeaderCell key={header.id} sortDirection={header.column.getIsSorted()}>
            {flexRender(
              header.column.columnDef.header,
              header.getContext()
            )}
          </HeaderCell>
        ))}
      </HeaderRow>
    ))}
  </TableHead>
  <TableBody>
    {table.getRowModel().rows.map(row => (
      <Row key={row.id}>
        {row.getVisibleCells().map(cell => (
          <Cell key={cell.id}>
            {flexRender(
              cell.column.columnDef.cell,
              cell.getContext()
            )}
          </Cell>
        ))}
      </Row>
    ))}
  </TableBody>
</Table>
```

### Code
```jsx
import Code from '@leafygreen-ui/code';

// Code block with syntax highlighting
<Code language="json" copyable={true}>
  {JSON.stringify(data, null, 2)}
</Code>

// JavaScript syntax highlighting
<Code language="javascript">
  {`function example() {
    return "Hello world!";
  }`}
</Code>
```

## Feedback & Indicators

### Banner
```jsx
import Banner from '@leafygreen-ui/banner';

// Success banner
<Banner variant="success">Operation completed successfully</Banner>

// Warning banner
<Banner variant="warning">Please review before proceeding</Banner>

// Danger/error banner
<Banner variant="danger">An error occurred</Banner>

// Info banner
<Banner variant="info">New features available</Banner>
```

### Callout
```jsx
import Callout from '@leafygreen-ui/callout';

// Information callout
<Callout
  title="Important Information"
  variant="info"
>
  <Body>This provides additional context to the user.</Body>
</Callout>

// Warning callout
<Callout
  title="Warning"
  variant="warning"
>
  <Body>This action cannot be undone.</Body>
</Callout>

// Note callout
<Callout
  title="Note"
  variant="note"
>
  <Body>Remember to save your changes.</Body>
</Callout>
```

### Modal
```jsx
import Modal from '@leafygreen-ui/modal';

// Basic modal
<Modal
  open={showModal}
  setOpen={setShowModal}
  size="large" // "small", "default", "large"
  title="Transaction Details"
>
  <div style={{ padding: spacing[3] }}>
    <Body>Modal content goes here</Body>
  </div>
  
  <div style={{ 
    display: 'flex', 
    justifyContent: 'flex-end', 
    padding: spacing[3],
    borderTop: `1px solid ${palette.gray.light2}`
  }}>
    <Button onClick={() => setShowModal(false)}>Close</Button>
  </div>
</Modal>
```

### LoadingIndicator
```jsx
import { Spinner } from '@leafygreen-ui/loading-indicator';

// Spinner
<Spinner />

// In a button
<Button 
  variant="primary" 
  disabled={loading}
  leftGlyph={loading ? <Spinner /> : <Icon glyph="Plus" />}
>
  {loading ? 'Loading...' : 'Submit'}
</Button>
```

### SkeletonLoader
```jsx
import {
  ParagraphSkeleton,
  CardSkeleton,
  TableSkeleton,
  FormSkeleton
} from '@leafygreen-ui/skeleton-loader';

// Paragraph skeleton
<ParagraphSkeleton withHeader />

// Card skeleton
<CardSkeleton style={{ height: '300px' }} />

// Table skeleton
<TableSkeleton
  rowCount={5}
  columnCount={4}
  style={{ height: '500px' }}
/>

// Form skeleton
<FormSkeleton fieldCount={3} />
```

### Tooltip
```jsx
import Tooltip from '@leafygreen-ui/tooltip';

// Basic tooltip
<Tooltip
  trigger={<Button>Hover Me</Button>}
  triggerEvent="hover"
>
  Tooltip content
</Tooltip>

// Directional tooltip
<Tooltip
  trigger={<Icon glyph="InfoWithCircle" />}
  triggerEvent="hover"
  placement="bottom"
>
  Additional information
</Tooltip>
```

### Avatar
```jsx
import Avatar from '@leafygreen-ui/avatar';

// User avatar with initials
<Avatar>JD</Avatar>

// With custom color
<Avatar backgroundColor={palette.green.base}>MG</Avatar>

// With image
<Avatar src="/path/to/image.jpg" />
```

## Color System

MongoDB LeafyGreen UI provides a consistent color palette through the `@leafygreen-ui/palette` package.

```jsx
import { palette } from '@leafygreen-ui/palette';
```

### Color Groups

- **Green**: Primary action colors, success states
  - From `palette.green.light3` (lightest) to `palette.green.dark3` (darkest)

- **Gray**: Neutral colors for text, backgrounds
  - From `palette.gray.light3` (lightest) to `palette.gray.dark3` (darkest)

- **Blue**: Secondary action colors, information states
  - From `palette.blue.light2` (lightest) to `palette.blue.dark2` (darkest)

- **Yellow**: Warning states
  - From `palette.yellow.light2` (lightest) to `palette.yellow.dark2` (darkest)

- **Red**: Error states, critical actions
  - From `palette.red.light2` (lightest) to `palette.red.dark2` (darkest)

- **Purple**: Tertiary colors, decorative elements
  - From `palette.purple.light2` (lightest) to `palette.purple.dark2` (darkest)

See the [PALETTE-GUIDE.md](./components/PALETTE-GUIDE.md) for detailed usage guidelines.

## Spacing

LeafyGreen UI provides consistent spacing tokens through the `@leafygreen-ui/tokens` package.

```jsx
import { spacing } from '@leafygreen-ui/tokens';
```

Spacing values range from `spacing[1]` (4px) to `spacing[4]` (32px):

- `spacing[1]`: 4px (Extra small spacing)
- `spacing[2]`: 8px (Small spacing)
- `spacing[3]`: 16px (Medium spacing)
- `spacing[4]`: 32px (Large spacing)

Example usage:
```jsx
<div style={{ 
  padding: spacing[3],
  marginBottom: spacing[2],
  gap: spacing[1]
}}>
  Content with consistent spacing
</div>
```

## Provider Configuration

The `LeafyGreenProvider` can be used to configure theme and other global settings:

```jsx
import LeafyGreenProvider from '@leafygreen-ui/leafygreen-provider';

<LeafyGreenProvider darkMode={false}>
  <App />
</LeafyGreenProvider>
```

## Additional Resources

- [LeafyGreen UI GitHub Repository](https://github.com/mongodb/leafygreen-ui)
- [LeafyGreen UI Documentation](https://www.mongodb.design/component/banner/example/)