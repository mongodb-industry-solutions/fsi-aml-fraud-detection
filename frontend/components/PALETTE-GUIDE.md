# MongoDB LeafyGreen UI Palette Guide

This document provides a reference for using the `@leafygreen-ui/palette` in the ThreatSight 360 frontend based on established design recommendations.

## Design Principles

Our color system follows these key principles:

- **Neutral colors** help maintain clarity, readability, and a visually pleasing user experience
- **Primary colors** serve as key components for brand recognition, visual hierarchy, interactivity, and conveying important information

## Color Usage Guidelines

- **Green**: Used for primary buttons and interactive elements to draw attention and prompt user actions. 
  Makes CTAs stand out and encourages users to click. Also indicates successful states.
  
- **Blue**: Used for links, secondary actions, or to call attention to information that needs to stand out.
  
- **Yellow**: Used for communicating content warnings and cautionary states.
  
- **Red**: Reserved for signaling critical errors, failures, or disabled content, ensuring users 
  immediately recognize and address urgent issues.
  
- **Purple**: Considered a tertiary color, used for decorative elements and backgrounds where status 
  indication isn't needed.

## Importing the Palette

```jsx
import { palette } from '@leafygreen-ui/palette';
```

## Primary Color Groups

### Green
- `palette.green.light3` - Lightest green, used for section backgrounds
- `palette.green.light2` - Light green, used for success indicators
- `palette.green.light1` - Slightly lighter green
- `palette.green.base` - Base green, used for icons
- `palette.green.dark1` - Slightly darker green
- `palette.green.dark2` - Darker green, used for icons in light backgrounds
- `palette.green.dark3` - Darkest green, used for headers

### Gray
- `palette.gray.light3` - Lightest gray, used for text on dark backgrounds
- `palette.gray.light2` - Light gray, used for backgrounds and footer text
- `palette.gray.light1` - Slightly lighter gray
- `palette.gray.base` - Base gray
- `palette.gray.dark1` - Darker gray, used for secondary text
- `palette.gray.dark2` - Very dark gray
- `palette.gray.dark3` - Darkest gray, used for footers

### Blue
- `palette.blue.light2` - Light blue, used for backgrounds
- `palette.blue.light1` - Slightly lighter blue
- `palette.blue.base` - Base blue, used for icons and links
- `palette.blue.dark1` - Slightly darker blue
- `palette.blue.dark2` - Dark blue, used for text on blue backgrounds

### Yellow
- `palette.yellow.light2` - Light yellow, used for warning backgrounds
- `palette.yellow.light1` - Slightly lighter yellow
- `palette.yellow.base` - Base yellow, used for medium risk indicators
- `palette.yellow.dark1` - Slightly darker yellow
- `palette.yellow.dark2` - Dark yellow, used for warning text and icons

### Red
- `palette.red.light2` - Light red, used for error backgrounds
- `palette.red.light1` - Slightly lighter red
- `palette.red.base` - Base red, used for high risk indicators
- `palette.red.dark1` - Slightly darker red
- `palette.red.dark2` - Dark red, used for error text

### Purple
- `palette.purple.light2` - Light purple, used for backgrounds
- `palette.purple.light1` - Slightly lighter purple
- `palette.purple.base` - Base purple
- `palette.purple.dark1` - Slightly darker purple
- `palette.purple.dark2` - Dark purple, used for text on purple backgrounds

## Common Usage Patterns

### Text Colors
- Primary text: Default (no color override)
- Secondary text: `palette.gray.dark1`
- Warning text: `palette.yellow.dark2`
- Error text: `palette.red.base`
- Success text: `palette.green.dark2`
- Text on dark backgrounds: `palette.gray.light3`
- Link text: `palette.blue.dark1`

### Background Colors
- Main section backgrounds: `palette.green.light3`
- Card backgrounds: Default (white)
- Success backgrounds: `palette.green.light2`
- Warning backgrounds: `palette.yellow.light2`
- Error backgrounds: `palette.red.light2`
- Information backgrounds: `palette.blue.light2`
- Footer backgrounds: `palette.gray.dark2`
- Header backgrounds: `palette.green.dark2`
- Secondary action backgrounds: `palette.blue.light2`

### Icons
- Default icons: `palette.gray.dark1`
- Primary action icons: `palette.green.dark1` or `palette.gray.light3` (on colored buttons)
- Secondary action icons: `palette.blue.dark1`
- Success icons: `palette.green.base`
- Warning icons: `palette.yellow.dark2`
- Error icons: `palette.red.base`
- Icons on dark backgrounds: `palette.gray.light3`

### Buttons
- Primary action buttons: 
  - Background: `palette.green.dark2`
  - Text: `palette.gray.light3`
  
- Secondary action buttons: 
  - Background: `palette.blue.light2`
  - Text: `palette.blue.dark2`
  - Border: `palette.blue.light1`
  
- Tertiary/Cancel buttons: 
  - Background: `palette.gray.light2`
  - Text: `palette.gray.dark1`
  - Border: `palette.gray.light1`

### Cards & Containers
- Default card: 
  - Border: `1px solid ${palette.gray.light2}`
  - Shadow: `0 2px 6px rgba(0,0,0,0.08)`
  
- Information card:
  - Border: `1px solid ${palette.blue.light2}`
  
- Success card:
  - Border: `1px solid ${palette.green.light2}`
  
- Warning card:
  - Border: `1px solid ${palette.yellow.light2}`
  
- Error card:
  - Border: `1px solid ${palette.red.light2}`

## Example Usage

```jsx
// Text color
<Body style={{ color: palette.gray.dark1 }}>Secondary information text</Body>

// Background color
<div style={{ backgroundColor: palette.green.light3 }}>Section background</div>

// Icon color
<Icon glyph="Checkmark" fill={palette.green.base} />

// Border color
<div style={{ border: `1px solid ${palette.gray.light2}` }}>Bordered container</div>

// Combined styling
<div style={{ 
  backgroundColor: palette.blue.light2,
  border: `1px solid ${palette.blue.base}`,
  borderRadius: '4px',
  padding: spacing[2]
}}>
  <Body style={{ color: palette.blue.dark2 }}>Information message</Body>
</div>
```

For more details, consult the official [@leafygreen-ui/palette documentation](https://github.com/mongodb/leafygreen-ui/tree/main/packages/palette).