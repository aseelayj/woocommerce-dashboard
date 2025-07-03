# WooCommerce Multi-Store Dashboard - QA Testing Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Testing Environment Setup](#testing-environment-setup)
3. [Authentication Testing](#authentication-testing)
4. [Dashboard Testing](#dashboard-testing)
5. [Order Management Testing](#order-management-testing)
6. [Invoice Generation Testing](#invoice-generation-testing)
7. [Multi-Store Testing](#multi-store-testing)
8. [Performance Testing](#performance-testing)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)
10. [Test Data Requirements](#test-data-requirements)
11. [Bug Reporting Guidelines](#bug-reporting-guidelines)

## System Overview

The WooCommerce Multi-Store Dashboard is a React-based web application that allows users to manage multiple WooCommerce stores from a single interface. The system provides real-time analytics, order management, and invoice generation capabilities.

### Key Technologies
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Authentication**: Supabase Auth
- **API Integration**: WooCommerce REST API v3
- **PDF Generation**: jsPDF & html2canvas
- **Build Tool**: Vite

### Application Modes
1. **Mock Mode**: Uses demo data (no authentication required)
2. **Production Mode**: Requires real WooCommerce API credentials

## Testing Environment Setup

### Local Development Access
- **Local URL**: http://localhost:5173
- **Public URL**: The ngrok URL provided (e.g., https://xxxxx.ngrok-free.app)

### Test Accounts
1. **Mock Mode**: No authentication required
2. **Production Mode**: 
   - Use test email/password provided by development team
   - Or create new account via signup flow

### Browser Requirements
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

## Authentication Testing

### 1. Sign Up Flow
**Test Cases:**
- [ ] Valid email format validation
- [ ] Password strength requirements (min 6 characters)
- [ ] Duplicate email prevention
- [ ] Success redirect to dashboard
- [ ] Error message display for invalid inputs

### 2. Login Flow
**Test Cases:**
- [ ] Valid credentials login
- [ ] Invalid email format rejection
- [ ] Incorrect password error handling
- [ ] "Remember me" functionality
- [ ] Session persistence across browser refresh
- [ ] Logout functionality

### 3. Password Reset
**Test Cases:**
- [ ] Reset email sent for valid email
- [ ] Error handling for non-existent email
- [ ] Reset link functionality
- [ ] Password update success

## Dashboard Testing

### 1. Single Store Dashboard
**Test Cases:**
- [ ] Revenue metrics display correctly
- [ ] Order count accuracy
- [ ] Average order value calculation
- [ ] Growth percentage calculations
- [ ] Date range picker functionality:
  - Today, Yesterday, Last 7 days, Last 30 days
  - Custom date range selection
- [ ] Data refresh on date change
- [ ] Loading states display
- [ ] Empty state handling

### 2. Recent Orders Widget
**Test Cases:**
- [ ] Display last 5 orders
- [ ] Order status badges (color coding)
- [ ] Customer name display
- [ ] Order total formatting
- [ ] Click to view order details

### 3. Order Status Breakdown
**Test Cases:**
- [ ] Pie chart displays all statuses
- [ ] Hover tooltips show counts
- [ ] Legend functionality
- [ ] Responsive design on resize

## Order Management Testing

### 1. Orders Table
**Test Cases:**
- [ ] Pagination controls (10/25/50/100 per page)
- [ ] Column sorting (Order ID, Date, Customer, Total, Status)
- [ ] Search functionality:
  - By order number
  - By customer name
  - By email
- [ ] Status filter dropdown
- [ ] Date range filtering
- [ ] Responsive table on mobile

### 2. Order Details Drawer
**Test Cases:**
- [ ] Opens on order click
- [ ] Displays complete order information:
  - Order number and date
  - Customer details
  - Billing address
  - Shipping address
  - Product line items with images
  - Pricing breakdown
  - Payment method
  - Order notes
- [ ] Close functionality (X button and outside click)

### 3. Order Status Updates
**Test Cases:**
- [ ] Status dropdown shows current status
- [ ] Update status successfully
- [ ] Confirmation before status change
- [ ] Error handling for failed updates
- [ ] UI updates after status change

### 4. Virtualized Table Performance
**Test Cases:**
- [ ] Smooth scrolling with 1000+ orders
- [ ] No lag on rapid scrolling
- [ ] Correct row heights maintained
- [ ] Search/filter performance

## Invoice Generation Testing

### 1. Single Invoice Generation
**Test Cases:**
- [ ] "Download Invoice" button functionality
- [ ] PDF generation loading state
- [ ] PDF content accuracy:
  - Store information
  - Invoice number format
  - Customer details
  - Product list with prices
  - Tax calculations
  - Shipping costs
  - Total amount
- [ ] PDF download with correct filename
- [ ] Error handling for generation failures

### 2. Bulk Invoice Download
**Test Cases:**
- [ ] Select date range for bulk download
- [ ] Progress indicator during generation
- [ ] ZIP file creation for multiple invoices
- [ ] Individual PDF accuracy within ZIP
- [ ] Memory handling for large batches

### 3. Invoice Layout
**Test Cases:**
- [ ] Professional formatting
- [ ] Logo display (if configured)
- [ ] Page breaks for long product lists
- [ ] Currency formatting
- [ ] Print-friendly layout

## Multi-Store Testing

### 1. Store Management
**Test Cases:**
- [ ] Add new store:
  - URL validation
  - API key/secret validation
  - Connection test
  - Save functionality
- [ ] Edit store credentials
- [ ] Delete store confirmation
- [ ] Enable/disable store toggle
- [ ] Store selection dropdown

### 2. Multi-Store Dashboard
**Test Cases:**
- [ ] Aggregated metrics accuracy
- [ ] Individual store cards display
- [ ] Store switching functionality
- [ ] Performance with 5+ stores
- [ ] Data isolation between stores

### 3. Cross-Store Orders
**Test Cases:**
- [ ] Combined orders table
- [ ] Store column identification
- [ ] Filtering by store
- [ ] Search across all stores
- [ ] Individual store order counts

## Performance Testing

### 1. Load Times
**Target Metrics:**
- [ ] Initial page load: < 3 seconds
- [ ] Dashboard data fetch: < 2 seconds
- [ ] Order table load: < 1.5 seconds
- [ ] Invoice generation: < 3 seconds

### 2. Data Volume Testing
**Test Scenarios:**
- [ ] 10,000+ orders performance
- [ ] 100+ products per order
- [ ] 10+ stores simultaneously
- [ ] Large date ranges (1 year+)

### 3. Concurrent Usage
**Test Cases:**
- [ ] Multiple browser tabs
- [ ] Different users accessing same store
- [ ] API rate limit handling
- [ ] Cache effectiveness

## Edge Cases & Error Handling

### 1. Network Issues
**Test Cases:**
- [ ] Offline mode detection
- [ ] API timeout handling (30s timeout)
- [ ] Retry mechanisms
- [ ] Error message clarity
- [ ] Partial data loading

### 2. Data Validation
**Test Cases:**
- [ ] Missing required fields handling
- [ ] Invalid data format handling
- [ ] Negative number prevention
- [ ] Date validation
- [ ] Currency format issues

### 3. Authorization Errors
**Test Cases:**
- [ ] Expired session handling
- [ ] Invalid API credentials
- [ ] Permission denied scenarios
- [ ] Automatic logout on 401

### 4. Browser Compatibility
**Test Cases:**
- [ ] PDF generation across browsers
- [ ] Date picker functionality
- [ ] Table virtualization
- [ ] Responsive design breakpoints

## Test Data Requirements

### Order Statuses
Test orders should include all statuses:
- `pending`
- `processing`
- `on-hold`
- `completed`
- `cancelled`
- `refunded`
- `failed`

### Product Variations
- Simple products
- Variable products
- Digital products
- Products with long names
- Products without images
- Zero-price products (free)

### Customer Types
- Guest customers
- Registered customers
- International addresses
- Special characters in names
- Missing contact information

### Edge Case Orders
- Orders with 50+ line items
- Orders with discounts/coupons
- Orders with multiple tax rates
- Orders with custom fees
- Partially refunded orders

## Bug Reporting Guidelines

### Required Information
1. **Environment**:
   - Browser and version
   - Operating system
   - Screen resolution
   - Network speed

2. **Reproduction Steps**:
   - Exact click sequence
   - Data entered
   - Expected vs actual behavior
   - Screenshots/screen recordings

3. **Error Details**:
   - Console errors (F12 → Console)
   - Network errors (F12 → Network)
   - Error messages displayed

### Severity Levels
- **Critical**: System crash, data loss, security issue
- **High**: Major feature broken, blocking workflow
- **Medium**: Feature partially working, workaround exists
- **Low**: Minor UI issues, cosmetic problems

### Bug Report Template
```
**Title**: [Feature] Brief description

**Environment**:
- Browser: 
- OS: 
- User Type: 
- Store Mode: Mock/Production

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:

**Actual Result**:

**Screenshots/Video**:

**Console Errors**:
```

## Testing Checklist Summary

### Pre-Launch Critical Tests
1. [ ] Authentication flow complete
2. [ ] Dashboard loads with accurate data
3. [ ] Orders display and search correctly
4. [ ] Invoice generation works
5. [ ] Multi-store switching functions
6. [ ] Error states handled gracefully
7. [ ] Mobile responsive design verified
8. [ ] Performance acceptable under load

### Regression Test Suite
Run these tests after each deployment:
1. [ ] Login/logout cycle
2. [ ] View dashboard for different date ranges
3. [ ] Search and filter orders
4. [ ] Generate sample invoice
5. [ ] Add/edit store configuration
6. [ ] Check all responsive breakpoints

### Security Testing
1. [ ] API credentials not exposed in browser
2. [ ] Session timeout after inactivity
3. [ ] XSS prevention on user inputs
4. [ ] CSRF protection on state changes
5. [ ] Secure password requirements

## Contact Information

**Development Team**: [Contact details]
**QA Lead**: [Contact details]
**Bug Tracking**: [System URL]
**Documentation**: [Wiki/Confluence link]

---

*Last Updated: [Current Date]*
*Version: 1.0*