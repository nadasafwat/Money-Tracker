<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Money Tracker 💰

A modern, responsive Progressive Web App (PWA) designed to help you track your personal finances, built with React, Vite, and Tailwind CSS.

## Project Idea

**Money Tracker** was built to provide a simple, secure, and fully local way to manage personal income and expenses. It prioritizes user privacy by storing all transaction data entirely on your device (via `localStorage`), ensuring your financial data never leaves your computer or phone. 

The application features a visually appealing, mobile-first interface that makes it easy to log daily transactions on the go, categorize spending (with built-in English and Arabic support), and visualize your financial health over time.

## Key Features

- **Local Authentication:** Secure, offline user registration and login system allowing multiple profiles on the same device.
- **Transaction Management:** Easily log income and expenses with detailed descriptions, dates, and payment methods (Cash/Card).
- **Dashboard & Analytics:** Dynamic, real-time visualizations using *Recharts*, showing monthly trends and expense distributions.
- **Smart Filtering:** Quickly filter your transactions by month, transaction type (income/expense), and dynamic categories.
- **Data Portability:** Seamlessly bulk-import CSV text, import CSV files, or export your entire financial history to a CSV file for safekeeping.
- **Mobile-First Design:** Fully responsive UI built with Tailwind CSS, ensuring a premium, app-like experience on any screen size.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React (Icons)
- **Visualizations:** Recharts, Motion
- **Testing:** Vitest, React Testing Library

## Run Locally

**Prerequisites:** Node.js v18+

1. Install the project dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to the provided local URL (usually `http://localhost:3000`).

## Testing

To run the automated test suite for the core functionality, use:

```bash
npm run test
```
