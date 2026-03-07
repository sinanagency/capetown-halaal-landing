# Cape Town Halaal - Required Changes

**Date:** 2026-03-07
**Status:** Pending Implementation

---

## 1. Logo Replacement

**Current:** Red crescent moon icon with "Cape Town Halaal / Lifestyle Expo 2026"
**Replace with:** "Young at Heart" circular logo (purple/orange gradient with heart)

- Update logo in header
- Update logo in all pages (register, dashboard, etc.)
- Update favicon

---

## 2. Header Simplification

**Current:** Two buttons - "Exhibitor Login" + "Book Booth"
**Replace with:** Single button - "Vendor Application"

- Remove "Exhibitor Login" button
- Remove "Book Booth" button
- Add "Vendor Application" button (links to `/register`)
- **ADD:** "Sponsors" link to header nav (scrolls/links to sponsors section)

---

## 3. Registration Flow

**Current:** `/register` is a vendor application form (submits to Netlify)
**Required:** Account creation flow leading to dashboard

Flow:
1. Click "Vendor Application" on homepage
2. Go to `/register` - Create account form with:
   - Full Name
   - Email
   - Company Name
   - Phone Number
   - Password
   - Confirm Password
3. After registration -> redirect to `/dashboard`

---

## 4. Background Color Change

**Current:** Dark theme (`bg-[#0e0e11]`)
**Required:** White background throughout entire site

- Change all pages to white background
- Update text colors for contrast (dark text on white)
- Update card/component styling for light theme

---

## 5. REMOVE: Photo Slideshow Section

**Section:** "A Taste of What Awaits" / "Experience" section
**Content:** Food photos, venue photos, crowd photos grid

**Action:** DELETE entire section with all photos

---

## 6. REMOVE: Stats Section (Demo Data)

**Section:** Stats bar showing:
- 97% Would Exhibit Again
- 4.9/5 Average Rating
- 85% Rebook Rate
- 15K+ Leads Generated

**Action:** DELETE entire section (fake demo data)

---

## 7. REMOVE: All "Demo" Labels

Remove any text/badges that say:
- "Demo mode"
- "Demo version"
- "Data pre-filled"
- Any similar demo indicators

---

## 8. "Watch Highlights" Button Fix

**Current:** "Watch Highlights" button on hero section
**Action:** When clicked, scroll to "See It In Action" video section

The video section shows:
- "EXPO HIGHLIGHTS 2025"
- "The Cape Town Halaal Experience"
- Video player with crowd footage

---

## 9. Add "Sponsors" to Header Nav

**Action:** Add "Sponsors" link to header navigation

When clicked, scroll/navigate to "Become a Sponsor" section showing:
- Official Sponsor: R1,000,000+
- Platinum Sponsor: R500,000+
- Gold Sponsor: R250,000+
- Silver Sponsor: R100,000+
- Bronze Sponsor: R50,000+

---

## 10. Update Event Info (Countdown Section)

**Current (WRONG):**
- "March 2026"
- "Green Point A Track"
- "50,000+ visitors"
- "400+ exhibitors"

**Correct (from Vercel landing page):**
- **Event:** Young at Heart Festival 2026
- **Dates:** December 11-13, 2026
- **Venue:** Youngsfield Military Base, Cape Town
- **Visitors:** 25,000+
- **Vendors:** 350+

Update countdown timer target date to: December 11, 2026

---

## 11. Missing Pages (Need to be built)

### 11.1 Dashboard (`/dashboard`)
- Shows: Total Bookings, Confirmed, In Cart, Total Invested
- Your Bookings section with booth list
- Event Details sidebar
- Quick Actions: Download Invoice, Exhibitor Guidelines, Venue Map
- Header nav: Floor Plan, Vendors, Dashboard

### 11.2 Exhibitor/Pricing (`/exhibitor`)
- "Choose Your Space" pricing page
- Booth tiers:
  - Standard: 3x2 (6m2) - R 2,500
  - Medium: 3x3 (9m2) - R 4,000
  - Large: 4x4 (16m2) - R 6,000
  - Premium: 6x6 (36m2) - R 8,000 (Popular)
- Each tier shows: signage, tables, chairs, power outlets
- "Select Booth" buttons

### 11.3 Floor Plan (`/floor-plan`)
- Interactive booth map with 3D/2D toggle
- Bird View / Street View options
- Booth filtering by zone and size

### 11.4 Vendors (`/vendors`)
- Vendor directory (referenced in nav)

### 11.5 Login (`/login`)
- For returning exhibitors
- "Already have an account? Sign in" link from register

---

## 12. Authentication System (Missing)

**Current:** No auth - forms submit to Netlify function
**Required:** Full auth system

- User registration with email/password
- User login
- Session management
- Protected routes (dashboard, bookings)
- Backend: Supabase or similar

---

## 13. Booking/Payment System (Missing)

**Current:** No booking functionality
**Required:** Full booth booking flow

- Select booth from pricing or floor plan
- Add to cart
- Checkout with payment
- Booking confirmation
- Invoice generation

---

## 14. Admin Portal for Samreen

**URL:** `admin.cthalaal.co.za` (new subdomain)
**Purpose:** Review and approve/reject vendor applications

### Features Required:
- **Login:** Secure admin login (Samreen only)
- **Application List:** View all vendor applications
  - Filter by: Pending, Approved, Rejected
  - Search by business name, contact name, email
  - Sort by date submitted
- **Application Details:** View full application
  - Business info, contact info, social media
  - Application date
- **Actions:**
  - Approve application (sends approval email)
  - Reject application (sends rejection email)
  - Request more info (sends email with custom message)
  - Add internal notes
- **Dashboard Stats:**
  - Total applications
  - Pending review
  - Approved
  - Rejected

### Tech Stack:
- Separate Next.js project OR same project with `/admin` route
- Supabase for data storage
- Protected by authentication

---

## 15. Auto Email System

**Email:** `admin@cthalaal.co.za` (GoDaddy email)
**Purpose:** Automated responses to vendor applications

### Email Templates Needed:

#### 15.1 Application Received (Auto-reply)
```
Subject: We received your vendor application - Young at Heart Festival 2026

Dear [Business Name],

Thank you for applying to be a vendor at Young at Heart Festival 2026!

We have received your application and our team will review it shortly.
You can expect to hear back from us within 3-5 business days.

Event Details:
- Date: December 11-13, 2026
- Venue: Youngsfield Military Base, Cape Town

If you have any questions, reply to this email.

Best regards,
Samreen Kumandan
Young at Heart Festival Team
```

#### 15.2 Application Approved
```
Subject: Congratulations! Your vendor application has been approved

Dear [Business Name],

Great news! Your application to be a vendor at Young at Heart Festival 2026
has been approved!

Next Steps:
1. Log in to your vendor portal: https://cthalaal.co.za/login
2. Select and book your booth
3. Complete payment to secure your spot

Booth Pricing:
- Standard (6m2): R 2,500
- Medium (9m2): R 4,000
- Large (16m2): R 6,000
- Premium (36m2): R 8,000

Spaces are limited - book early to get your preferred location!

Welcome to the Young at Heart family!

Best regards,
Samreen Kumandan
```

#### 15.3 Application Rejected
```
Subject: Update on your vendor application

Dear [Business Name],

Thank you for your interest in Young at Heart Festival 2026.

After careful review, we regret to inform you that we are unable to
accommodate your application at this time.

[Optional: Custom reason from Samreen]

We encourage you to apply again for future events.

Best regards,
Samreen Kumandan
Young at Heart Festival Team
```

#### 15.4 Request More Info
```
Subject: Additional information needed - Vendor Application

Dear [Business Name],

Thank you for applying to Young at Heart Festival 2026.

Before we can process your application, we need some additional information:

[Custom message from Samreen]

Please reply to this email with the requested details.

Best regards,
Samreen Kumandan
```

### Implementation Options:

**Option A: Resend (Recommended)**
- Use Resend.com for transactional emails
- Send FROM: admin@cthalaal.co.za (requires DNS verification)
- API-based, easy to integrate with Next.js

**Option B: GoDaddy SMTP**
- Use GoDaddy's SMTP server directly
- Server: smtpout.secureserver.net
- Port: 465 (SSL) or 587 (TLS)
- Requires storing email credentials securely

**Option C: Supabase Edge Functions + Resend**
- Trigger emails on database changes
- Serverless, scales automatically

---

## 16. GoDaddy Setup Guide

### 16.1 Create Subdomain for Admin Portal

1. Log in to GoDaddy: https://dcc.godaddy.com/
2. Go to: My Products → Domains → cthalaal.co.za → DNS
3. Add new record:
   ```
   Type: CNAME
   Name: admin
   Value: cname.vercel-dns.com
   TTL: 1 hour
   ```
4. In Vercel:
   - Go to Project Settings → Domains
   - Add: admin.cthalaal.co.za
   - Vercel will verify automatically

### 16.2 Fix Main Domain DNS (Currently Misconfigured)

Current issue: DNS not pointing to Vercel properly.

Add/Update these records:
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 1 hour

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 1 hour
```

### 16.3 Email DNS for Resend (If Using Resend)

To send emails FROM admin@cthalaal.co.za via Resend:

1. Sign up at resend.com
2. Add domain: cthalaal.co.za
3. Resend will give you DNS records to add:
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]

   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

### 16.4 GoDaddy Email Settings (If Using SMTP)

If sending via GoDaddy SMTP directly:

**SMTP Settings:**
- Server: smtpout.secureserver.net
- Port: 465 (SSL) or 587 (TLS)
- Username: admin@cthalaal.co.za
- Password: [email password]
- Authentication: Required

**Environment Variables (add to Vercel):**
```
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_USER=admin@cthalaal.co.za
SMTP_PASS=xxxxx
```

---

## Summary of Removals

| Element | Action |
|---------|--------|
| Photo slideshow ("A Taste of What Awaits") | DELETE |
| Stats section (97%, 4.9/5, etc.) | DELETE |
| All "Demo" labels | DELETE |
| "Exhibitor Login" button | DELETE |
| "Book Booth" button | DELETE |

---

## Summary of Additions

| Element | Action |
|---------|--------|
| "Vendor Application" button | ADD to header |
| "Sponsors" nav link | ADD to header |
| Young at Heart logo | REPLACE current logo |
| Admin portal | NEW subdomain: admin.cthalaal.co.za |
| Auto email system | NEW: Resend or GoDaddy SMTP |

---

## Priority Order

1. **Critical:** Update event info to correct dates/venue
2. **Critical:** Remove demo data sections
3. **Critical:** Fix DNS for cthalaal.co.za (A record)
4. **High:** Logo replacement
5. **High:** Header changes (Vendor Application + Sponsors)
6. **High:** Background to white
7. **High:** Fix "Watch Highlights" scroll behavior
8. **High:** Set up admin subdomain DNS
9. **High:** Auto email system setup
10. **Medium:** Build admin portal for Samreen
11. **Medium:** Build registration with account creation
12. **Medium:** Build dashboard page
13. **Medium:** Authentication system
14. **Low:** Floor plan, vendors pages

---

## Database Schema (Supabase)

```sql
-- Vendor Applications
CREATE TABLE vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business Info
  business_name TEXT NOT NULL,
  business_description TEXT,
  website TEXT,

  -- Social
  instagram TEXT,
  facebook TEXT,

  -- Contact
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Application Status
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, info_requested
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Email Tracking
  confirmation_sent_at TIMESTAMPTZ,
  decision_sent_at TIMESTAMPTZ
);

-- Admin Users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Samreen as admin
INSERT INTO admin_users (email, name)
VALUES ('samreen@cthalaal.co.za', 'Samreen Kumandan');
```

---

*Generated by Claude Code - Updated 2026-03-07*
