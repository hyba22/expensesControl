# ExpenseControl

A personal finance app I built to finally understand where my salary goes every month.

You can log your expenses, import your bank statements and payslips (PDF or CSV), set monthly budgets, look at a few charts, and ask a small AI assistant questions about your own spending. The interface works in French and English, in light and dark mode.

## Why I made it

Most budgeting apps I tried didn't fit how things work in Tunisia:

- Banks send statements as **PDF files**, not nice CSV exports.
- My payslip is a **scanned image** inside a PDF, so normal PDF readers see an empty page.
- Amounts are in **dinars with 3 decimals** (millimes), which a lot of apps round badly.
- The salary arrives at the **end of the month** and pays for the *next* month, so "income this month" doesn't mean much.

So I built something around those details instead of fighting them.

## Features

- **Transactions and categories.** Add income and expenses in a few seconds. Every account starts with categories that make sense here (Courses, Factures STEG/SONEDE, Loyer…), and you can create your own with an icon and a color.
- **Import PDF and CSV.**
  - Bank statement PDFs are read line by line, and each amount is put on the right side by looking at where it sits under the *Débit* / *Crédit* columns.
  - CSV columns are detected automatically, and you can fix them if the guess is wrong.
  - Payslips are read even when they're scanned: the app runs OCR on the page and pulls out the month, gross salary, CNSS, IRPP and net pay.
  - Before anything is saved, you get a preview where you can untick lines, change categories, and spot duplicates you already recorded.
  - Files are read in memory and never stored.
- **Automatic categories.** Carrefour goes to groceries, STEG to bills, Ooredoo to phone, and so on. It also remembers what you chose before for the same merchant.
- **Budgets.** A monthly limit per category, with a suggested amount based on your last 3 months. The bars turn orange at 80 % and red at 100 %, and you get an alert the moment an expense crosses a limit.
- **Statistics.** Where the money goes (donut chart), how fast you're spending compared with last month, the last 6 months side by side, and the places you spend the most.
- **AI assistant.** A little robot in the corner you can chat with. It sees a summary of your real numbers (budgets, categories, recent transactions) and gives short, practical budgeting tips. It won't give investment advice, and it ignores any instructions that might be hiding in imported bank text.
- **Your account.** Pick your currency (dinars by default, or euros, dollars and a few others), change your name or password, reset a forgotten password by email, or delete your account and everything in it.

## Tech stack

| Part | What I used |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Motion (animations), Recharts, Lucide icons |
| Backend | NestJS 12, TypeScript, Prisma 7 |
| Database | PostgreSQL |
| Auth | JWT access tokens + rotating refresh tokens in httpOnly cookies, Argon2 password hashing |
| Imports | unpdf (PDF text), Tesseract.js (OCR for scanned PDFs), csv-parse |
| AI | Cloudflare Workers AI (Llama 3.3 70B), streamed to the browser |
| Emails | Nodemailer with Gmail SMTP (Resend also works) |
| Tests | Vitest |

## A few things I'm happy with

**Security.** Passwords are hashed with Argon2id. The access token only lives in memory, and the refresh token sits in an httpOnly cookie that's single-use: if an old one is ever replayed, the whole session is closed. Login and sign-up are rate-limited, every query is scoped to the logged-in user, and the API rejects unknown fields. Password reset links last 30 minutes, work once, and sign you out everywhere; asking for one never tells you whether an email has an account.

**Money is stored as integers.** Everything is saved in millimes (`12.500 TND` → `12500`), so totals are always exact.

**Reading scanned payslips.** On my own payslip, the OCR couldn't read the table headers (small text on a blue background), so it didn't know which column was the employee's CNSS deduction. Instead of relying on the layout, the parser uses the math: on a line like *base, rate, amount, employer rate, employer amount*, the employee deduction is the value equal to `base × rate`. That works whatever the payslip looks like.

**The assistant stays grounded.** It only gets aggregated numbers and recent transactions, has a daily message limit per user to stay within the free tier, and the data block is clearly separated from its instructions.

## Running it locally

You'll need **Node.js 22+** and **PostgreSQL**.

```bash
git clone https://github.com/hyba22/expensesControl.git
cd expensesControl
```

**1. Database.** Create a user and a database, for example in `psql`:

```sql
CREATE ROLE finance_app WITH LOGIN PASSWORD 'choose-a-password' CREATEDB;
CREATE DATABASE finance_tracker OWNER finance_app;
```

**2. Backend.**

```bash
cd backend
cp .env.example .env    # then fill in DATABASE_URL and a long random JWT_ACCESS_SECRET
npm install
npx prisma migrate dev
npm run start:dev       # http://localhost:3000, API docs at /api/docs
```

Two things in `.env` are optional, and the rest of the app works without them:

- **AI assistant:** your Cloudflare account ID and a Workers AI API token.
- **Password reset emails:** a Gmail address in `SMTP_USER` and a Gmail [app password](https://myaccount.google.com/apppasswords) in `SMTP_PASS` (2-step verification has to be on). Without them, the reset link is printed in the backend terminal instead.

**3. Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## Trying the import

The `samples/` folder has a fake payslip, a fake bank statement PDF and a CSV export. All the names and numbers in them are made up, so you can play with the import page without using real documents.

## Tests

```bash
cd backend && npm test    # auth tokens, PDF/CSV parsers, payslip reading
cd frontend && npm test   # amount parsing
```

## Project structure

```
backend/
  prisma/            database schema and migrations
  src/
    auth/            sign-up, login, tokens, password reset, account deletion
    mail/            reset emails (Gmail SMTP or Resend)
    transactions/    transactions and the dashboard summary
    categories/      default and custom categories
    imports/         PDF/CSV/OCR parsing and auto-categorization
    budgets/         monthly limits and alerts
    stats/           data for the charts
    assistant/       AI assistant (Workers AI)
frontend/
  src/
    pages/           dashboard, transactions, statistics, budgets, categories, import, settings
    components/      shared UI, including the assistant chat
    i18n/            French and English texts
samples/             fake documents for testing imports
```

---

Made by [Hyba](https://github.com/hyba22).
