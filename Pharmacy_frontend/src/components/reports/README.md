# Reports Module - Optimized Structure

This module has been optimized to reduce code duplication and improve maintainability.

## Structure

```
reports/
├── common/              # Shared components
│   ├── ReportLayout.jsx       # Main wrapper with header
│   ├── ReportTabs.jsx         # Navigation tabs
│   ├── ReportControls.jsx     # Filter and export controls
│   ├── KPICard.jsx            # KPI card component
│   └── index.js               # Barrel export
├── styles/              # Unified styles
│   └── reports.css            # Common CSS for all reports
├── utils/               # Shared utilities
│   ├── exportUtils.js         # Export functionality
│   └── index.js               # Barrel export
├── SalesReport.jsx      # Sales report page
├── PurchaseReport.jsx   # Purchase report page
├── ExpiryReport.jsx     # Expiry report page
└── TopSellingReport.jsx # Top selling report page
```

## Shared Components

### ReportLayout
Main wrapper component that provides consistent page structure with header, title, and subtitle.

**Props:**
- `title` - Page title
- `subtitle` - Page subtitle
- `headerActions` - Optional actions to display in header (e.g., export button)
- `children` - Page content

**Usage:**
```jsx
<ReportLayout
  title="Reports & Analytics"
  subtitle="View detailed reports and insights"
>
  {/* content */}
</ReportLayout>
```

### ReportTabs
Navigation tabs for switching between different report types.

**Usage:**
```jsx
<ReportTabs />
```

### ReportControls
Controls section for filters and export button.

**Props:**
- `showMonthFilter` - Show month range filter (boolean)
- `monthsRange` - Current month range value
- `onMonthsChange` - Callback for month range change
- `onExport` - Export handler function
- `children` - Optional additional controls

**Usage:**
```jsx
<ReportControls
  showMonthFilter={true}
  monthsRange={monthsRange}
  onMonthsChange={setMonthsRange}
  onExport={handleExport}
/>
```

### KPICard
Stat card component for displaying key metrics.

**Props:**
- `title` - Card title
- `value` - Main value to display
- `subtitle` - Optional subtitle
- `variant` - Color variant: 'green', 'orange', 'blue', 'purple'

**Usage:**
```jsx
<KPICard
  title="Total Revenue"
  value="₹ 1,234,567"
  variant="green"
/>
```

## Utilities

### exportReport
Exports report data to XLSX file.

**Parameters:**
- `reportType` - Report type identifier (string)
- `params` - Additional parameters (object)

**Usage:**
```jsx
import { exportReport, getMonthsFromLabel } from "./utils";

const handleExport = () => {
  const months = getMonthsFromLabel(monthsRange);
  exportReport("SALES_REGISTER", { months });
};
```

### getMonthsFromLabel
Parses month count from "Last X Months" label.

**Parameters:**
- `label` - Month range label (e.g., "Last 6 Months")

**Returns:** Number

## CSS Classes

All reports use the unified `reports.css` file with the following key classes:

### Layout
- `.report-wrap` - Main wrapper
- `.report-header` - Header section
- `.report-title` - Page title
- `.report-subtitle` - Page subtitle

### Navigation
- `.report-tabs` - Tabs container
- `.report-tab` - Individual tab
- `.report-tab.active` - Active tab

### Controls
- `.report-controls` - Controls container
- `.report-select` - Select dropdown
- `.report-export-btn` - Export button
- `.report-filter-row` - Filter row
- `.report-filter-btn` - Filter button
- `.report-filter-btn.active` - Active filter

### Cards
- `.kpi-cards` - KPI cards grid
- `.kpi-card` - Individual KPI card
- `.kpi-card-{variant}` - Color variants (green, orange, blue, purple)
- `.report-chart-card` - Chart container
- `.report-table-card` - Table container

### Table
- `.report-table` - Table element
- `.report-table-wrap` - Table wrapper (scrollable)
- `.report-table-no-data` - Empty state

### Badges
- `.report-badge` - Badge base
- `.report-badge-critical` - Critical status
- `.report-badge-warning` - Warning status
- `.report-badge-safe` - Safe status
- `.report-rank` - Rank badge

### States
- `.report-loading` - Loading state
- `.report-error` - Error state

## Migration from Old CSS Files

The old CSS files have been replaced:
- ❌ `SalesPurchaseReport.css` → ✅ `styles/reports.css`
- ❌ `ExpiryReport.css` → ✅ `styles/reports.css`
- ❌ `TopSellingReport.css` → ✅ `styles/reports.css`

All components now use the unified CSS file for consistency.

## Benefits of Optimization

1. **Reduced Code Duplication**: Common components eliminate repetitive code
2. **Consistent UI**: All reports use the same styling and components
3. **Easier Maintenance**: Changes to common elements only need to be made once
4. **Better Performance**: Single CSS file reduces HTTP requests
5. **Improved Developer Experience**: Clearer structure and reusable components
6. **Type Safety**: Consistent prop interfaces across reports

## Adding New Reports

To add a new report:

1. Create a new component file (e.g., `NewReport.jsx`)
2. Import shared components:
   ```jsx
   import ReportLayout from "./common/ReportLayout";
   import ReportTabs from "./common/ReportTabs";
   import ReportControls from "./common/ReportControls";
   import KPICard from "./common/KPICard";
   import { exportReport } from "./utils/exportUtils";
   ```
3. Use the shared components in your report structure
4. Add the route in `ReportTabs.jsx` if needed
5. Follow the existing pattern from other reports
