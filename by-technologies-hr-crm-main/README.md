# B & Y Technologies | HR & Employee CRM

A modern, full-featured Human Resources & Employee Management Web Application built for **B & Y Technologies**. Powered by Next.js 15, React 19, TypeScript, Tailwind CSS, and Vercel.

---

## 🌟 Key Features

### 1. 👥 Employee Management
- Complete employee directory with full profile details (Designation, Department, Salary, Date of Joining, Contact).
- Auto-incrementing Employee IDs starting from `BYT-101`.
- Add, update, view, and permanently delete employee records with tombstone safety.

### 2. ⏱️ Attendance & Time Tracking
- Real-time clock-in and clock-out system with automatic status calculation (On Time, Late, Present).
- Monthly attendance overview and dynamic day-by-day logs.
- Attendance export to **Excel (.xls)** and **CSV** formats with automated monthly folder segregation.

### 3. 📅 Leave & Absence Management
- Employee leave application submission (Casual, Sick, Earned leave).
- Admin dashboard to review, approve, or reject leave requests with reason notes.

### 4. 📇 Visiting Card Studio
- High-fidelity visiting card generator mapped directly to official B & Y Technologies branding templates.
- Live canvas preview with pixel-perfect text placement for employee name, designation, phone, email, and website.
- Instant high-resolution PNG & PDF downloads.

### 5. 📄 HR Document Workspace & Offer Letter Generator
- Automated generation of official HR letters:
  - Letter of Offer
  - Letter of Appointment
  - Non-Disclosure Agreement (NDA)
- Instant Word (`.doc`) and print/PDF formatting with company letterhead.

### 6. 💼 Recruitment & Job Openings
- Post, manage, and track internal job requisitions across agency departments.
- Status workflows for open, in-review, and closed positions.

### 7. 💬 Team Communication
- Agency communication channels (#general, #tech-and-design, etc.).
- Direct messaging and announcement broadcast capabilities.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Document & Export**: [jsPDF](https://github.com/parallax/jsPDF), HTML5 Canvas
- **Cloud Storage / Database**: Local JSON fallback + [@vercel/blob](https://vercel.com/docs/storage/vercel-blob) for seamless cloud state persistence.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ramyaaramesh/by-technologies-hr-crm.git
   cd by-technologies-hr-crm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deployment on Vercel

This repository is optimized for one-click deployment on [Vercel](https://vercel.com).

### 1. Import Repository
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import `ramyaaramesh/by-technologies-hr-crm`.

### 2. Configure Environment (Optional for Cloud Persistence)
For serverless database persistence across cold starts:
1. In your Vercel Project Dashboard, navigate to the **Storage** tab.
2. Click **Create Database** -> select **Blob**.
3. Connect the Blob store to this project (this automatically populates `BLOB_READ_WRITE_TOKEN`).

### 3. Deploy
Click **Deploy**. Vercel will automatically build and host the application with free SSL and global CDN.

---

## 🔐 Default Credentials
- **Admin Username**: `admin`
- **Admin Password**: `admin123`

---

## 🏢 About
Crafted for **B & Y Technologies** — Chennai's premier digital technology & solutions agency.
