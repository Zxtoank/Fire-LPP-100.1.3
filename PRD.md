
# Product Requirements Document: LocketSnap

**Version:** 1.0
**Date:** 2024-05-23

---

## 1. Overview

LocketSnap is a web and mobile application that allows users to easily upload, crop, and arrange their photos onto a standard 4x6 inch print-ready sheet. The app is designed to simplify the process of creating perfectly sized photos for lockets, wallets, and other small keepsakes. Users can download their creations digitally or order professional physical prints directly through the app.

## 2. Target Audience

*   Individuals looking to create personalized photo gifts (e.g., lockets, keychains).
*   DIY crafters and scrapbookers.
*   Users who want a simple, mobile-friendly tool to prepare small photos for printing without needing complex desktop software.

## 3. Core Features

### 3.1. Photo Editing & Layout
- **Image Upload:** Users can upload a photo from their computer or mobile device.
- **Canvas Editor:** The uploaded image is displayed in an interactive editor.
- **Image Manipulation:**
    - **Drag:** Users can pan the image within the crop area.
    - **Zoom:** Users can use a mouse wheel (desktop) or pinch-to-zoom (mobile) to scale the image.
- **Crop Shapes:** Users can choose from several crop shapes:
    - Square
    - Circle
    - Heart
    - Oval
- **Print Preview:** The app automatically generates a preview showing the cropped photos arranged in various sizes on a standard 4x6 inch layout.

### 3.2. Purchasing & Downloads
- **Free Digital Downloads:** Users can download a 600 DPI image of their print layout in PNG or PDF format, suitable for home printing.
- **Paid Digital Downloads:** Users can purchase an ultra-high-resolution 1200 DPI version (PNG or PDF) via PayPal, suitable for professional printing.
- **Physical Print Ordering:** Users can order a physical 4x6 inch print on professional photo paper, which is then shipped to their address.

### 3.3. User Accounts & Management
- **Authentication:**
    - **Email/Password:** Standard sign-up and sign-in.
    - **Anonymous (Guest):** Users can use the app's core features without creating an account.
- **User Profile:** Logged-in users have a profile page where they can:
    - View their order history for physical prints.
    - View details of each order, including status and tracking information.
    - Access a record of their purchased digital downloads.
- **Account Deletion:** Users have the ability to permanently delete their account and all associated data, a requirement for the Google Play Store.

### 3.4. Admin Functionality
- **Admin Dashboard:** A secure page (`/admin/orders`) accessible only to a designated admin user.
- **Order Viewing:** The admin can view a list of all physical print orders placed by all users.
- **Order Management:** The admin can update an order's status (e.g., Processing, Shipped, Delivered) and add carrier and tracking number details.

## 4. User Flows

### 4.1. Main User Flow
1. User lands on the homepage and is presented with the image editor.
2. User uploads a photo.
3. User adjusts the photo's position and zoom within the chosen crop shape.
4. User clicks "Generate Print Preview."
5. The app displays the 4x6 layout.
6. The user can then choose to:
    a. Download a free 600 DPI file.
    b. Purchase and download a 1200 DPI file (redirects to PayPal if not on mobile).
    c. Order a physical print (requires login, proceeds to checkout).

### 4.2. Checkout Flow
1. User initiates a physical print order.
2. If not logged in, the user is prompted to sign in or create an account.
3. User enters their shipping address.
4. User completes the payment via PayPal.
5. The order is recorded in Firebase, and the user is redirected to their profile page.

## 5. Technical Stack

- **Frontend Framework:** Next.js (App Router), React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** ShadCN UI
- **Backend & Database:** Firebase (Authentication, Firestore)
- **Payments:** PayPal
- **Mobile:** Native Android WebView application wrapping the live web app.

## 6. Style Guidelines

- **Primary Color:** Green (`hsl(145 55% 40%)`)
- **Background Color:** Light Green (`hsl(140 70% 96%)`)
- **Fonts:**
    - **Headings:** 'Belleza'
    - **Body:** 'Alegreya'
- **Icons:** `lucide-react`
- **UI Feel:** Modern, clean, with rounded corners and soft shadows on card elements.
