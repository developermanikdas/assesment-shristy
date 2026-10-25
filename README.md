# RBI Grade B Baseline Assessment Web Application

> **A production-ready diagnostic assessment platform for RBI Grade B aspirants.**  
> Designed to assess candidates across a 4h10m scheduled diagnostic (+ 20m pooled buffer, 4h30m hard cap), capturing rich behavioral telemetry, enforcing strict answer secrecy, and enabling comprehensive mentor analytics and exports.

---

## 1. System Overview & Architecture

The **RBI Grade B Baseline Assessment** is a purpose-built, high-stakes diagnostic testing platform. Unlike standard pass/fail testing platforms, this system measures:
- Subject knowledge across Phase 1 (Quant, Reasoning, English, General Awareness) and Phase 2 (ESI, Finance & Management, Descriptive Writing).
- Cognitive metacognition (Confidence calibration: *Sure*, *Maybe*, *Guess*).
- Thinking and judgement through dynamic reflection (`D01` explains previous answers), situational ethics, and market estimation.
- Long-term mindset and personal background (study habits, distractions, reverse-scored Likert mindset scales).

### Key Technical Pillars
1. **Single Source of Truth**: Built directly from `questions/rbi_baseline_questions.json` (252 questions, 5 sets).
2. **Absolute Secrecy**: Answer keys (`ans`, `model_answer`, `rubrics`) are isolated in a restricted `answer_keys` collection during seeding and are **never** delivered over the wire to the student's browser.
3. **Server-Authoritative Timers**: Section countdowns are calculated server-side based on `startedAt`. Reloading the page or closing the browser tab preserves the true elapsed time.
4. **20-Minute Pooled Buffer**: A shared 20-minute buffer can be deployed at section expiry to continue difficult sections.
5. **Dual UI Modes**:
   - **Chat Mode** (Parts A, D, E): Conversational mentor bubble flow with inline widgets (chips, sliders, voice recorder, multi-select).
   - **Exam CBT Mode** (Parts B, C): Responsive computer-based test layout with split-screen passage/table view, rough notepad, question palette, review screen, and section locking.
6. **Autosave & Offline Queue**: Responses are stored optimistically, debounced, and synced with local storage fallback when connectivity drops.
7. **Mentor Dossier & Analytics**: Server-side scoring (+1 / -0.25), stamina curves, topic heatmaps, calibration matrix, verbatim answer viewer, audio player, and 1-click JSON bundle & flat CSV export.

---

## 2. Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with custom slate/emerald/amber palette, responsive mobile-first design, dark/light theme support
- **Database**: MongoDB (Atlas or local) with Mongoose 8.x
- **Audio Storage**: MongoDB GridFS for student voice notes (up to 90s audio recordings)
- **Validation**: Zod schema validation on every API endpoint
- **Authentication**: Signed HTTP-only session cookies (`jose` JWT) & bcrypt password hashing
- **Testing**: Vitest unit & integration test suites

---

## 3. Repository Structure

```text
├── questions/
│   └── rbi_baseline_questions.json  # Canonical single source of truth
├── scripts/
│   ├── seed.ts                      # Validates counts and seeds DB with answer-key segregation
│   ├── create-demo-attempt.ts       # Utility to spin up a demo candidate
│   ├── verify-api-payload.ts        # Automated secrecy verification test
│   ├── test-exam-flow.ts            # E2E simulated test taking and timer verification
│   └── test-mentor-export.ts        # E2E test for mentor login, analytics, and exports
├── src/
│   ├── app/
│   │   ├── admin/                   # Mentor portal (login, candidate dashboard, dossier, questions)
│   │   ├── take/[token]/            # Student assessment interface (PIN, Chat mode, CBT mode)
│   │   ├── api/                     # Server routes (attempt, autosave, timers, export, admin, audio)
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Landing page
│   ├── components/
│   │   └── exam/                    # ChatMode, ExamMode, Header, Notepad, AudioRecorder, Break, Finish
│   ├── lib/
│   │   ├── models/                  # Mongoose schemas: Question, Set, AnswerKey, Attempt, Response, EventLog, Admin
│   │   ├── auth.ts                  # Admin session & JWT utilities
│   │   ├── db.ts                    # MongoDB connection cache & GridFS bucket helper
│   │   ├── exam-flow.ts             # Server-authoritative timer & section transition engine
│   │   ├── i18n.ts                  # English & Hindi bilingual translations
│   │   ├── offline-queue.ts         # LocalStorage offline retry queue
│   │   ├── reflection.ts            # D01 dynamic MCQ reflection selector
│   │   ├── scoring.ts               # Analytics engine (+1/-0.25, calibration, stamina, Likert reverse)
│   │   └── validations.ts           # Zod schemas for all client-submitted payloads
│   └── types/                       # Shared TypeScript interfaces
├── tests/
│   └── assessment.test.ts           # Unit tests for scoring, timers, secrecy, Likert, reflection
├── .env.example                     # Environment template
└── package.json                     # Scripts and dependencies
```

---

## 4. Local Setup & Running Locally

### Prerequisites
- Node.js (v18.18+ or v20+)
- MongoDB (Running locally or a free MongoDB Atlas connection URI)

### Step 1: Clone and Install
```bash
cd "c:/Users/manik/Downloads/assesment app"
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Ensure `.env.local` contains:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/rbi_baseline
ADMIN_EMAIL=mentor@rbi-prep.local
ADMIN_PASSWORD=MentorRBI2026!
SESSION_SECRET=rbi-baseline-super-secret-mentor-key-2026-safe-secure-32chars
APP_URL=http://localhost:3000
```

### Step 3: Seed the Database
Run the seed script to read `questions/rbi_baseline_questions.json`, validate all section question counts, populate questions and sets, isolate answer keys into `answer_keys`, and seed the default mentor account:
```bash
npm run seed
```
*Expected Output:*
- Validates question counts:
  - B1 (Quant): 25 items
  - B2 (Reasoning): 25 items
  - B3 (English): 25 items
  - B4 (General Awareness): 40 items
  - C1 (ESI Objective): 20 items
  - C3 MCQs: 15 items
- Total 252 questions upserted.
- 5 shared sets upserted (`DI1`, `SEAT`, `PUZ`, `RC1`, `CLOZE`).
- 162 answer keys safely segregated into `answer_keys`.
- Mentor admin created (`mentor@rbi-prep.local`).

### Step 4: Run Test Suites
Verify scoring algorithms, negative marking, reverse Likert math, dynamic reflection selection, and secrecy:
```bash
npm test
```
Run automated payload and export verifications:
```bash
npx tsx scripts/verify-api-payload.ts
npx tsx scripts/test-mentor-export.ts
```

### Step 5: Start the Application
- **Development mode:**
  ```bash
  npm run dev
  ```
- **Production mode:**
  ```bash
  npm run build
  npm start
  ```
The web app will be available at `http://localhost:3000`.

---

## 5. Deployment Guide (Vercel + MongoDB Atlas)

### 1. MongoDB Atlas Setup
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a database user (e.g., `rbi_app_user`) with read/write privileges.
3. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) or configure Vercel IP blocks.
4. Copy your connection string:
   ```text
   mongodb+srv://rbi_app_user:<password>@cluster0.abcde.mongodb.net/rbi_baseline?retryWrites=true&w=majority
   ```

### 2. Initial Seeding to Atlas
From your local terminal, run the seed script pointing to your Atlas cluster:
```bash
MONGODB_URI="mongodb+srv://rbi_app_user:<password>@cluster0.abcde.mongodb.net/rbi_baseline?retryWrites=true&w=majority" npm run seed
```

### 3. Deploy to Vercel
1. Install the Vercel CLI or link your Git repository via [vercel.com](https://vercel.com).
2. Configure the following **Environment Variables** in the Vercel Project Settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `ADMIN_EMAIL`: `mentor@rbi-prep.local` (or your preferred mentor email).
   - `ADMIN_PASSWORD`: Your mentor password.
   - `SESSION_SECRET`: A secure 32+ character random string.
   - `APP_URL`: Your Vercel production domain (e.g., `https://rbi-baseline-assessment.vercel.app`).
3. Deploy:
   ```bash
   vercel --prod
   ```

---

## 6. Ten-Minute Demo Script (Testing Full Flow)

Use this quick walkthrough to test and demonstrate all major features in 10 minutes:

### 1. Admin Login & Candidate Creation (2 minutes)
1. Navigate to `http://localhost:3000/admin/login`.
2. Sign in with:
   - **Email:** `mentor@rbi-prep.local`
   - **Password:** `MentorRBI2026!`
3. Click **"New Candidate Attempt"** in the top-right corner.
4. Enter:
   - **Student Nickname:** `Ananya Verma`
   - **PIN:** `654321` (or leave empty for unpinned access).
5. Click **"Create Assessment Link"**.
6. Copy the private link (`/take/<token>`).

### 2. Student Experience: Chat Mode (Parts A, D, E) (3 minutes)
1. Open an Incognito window or mobile viewport (360px wide) and paste the candidate link.
2. Enter the PIN `654321` if prompted.
3. **Item A01 (Consent):** Read the friendly diagnostic notice and click **"I Understand & Agree"**.
4. Test the **Hindi / English toggle** in the header to observe instant UI label translation.
5. Answer questions using the conversational chips, sliders, and text inputs:
   - A02: Enter name.
   - A03-A06: Select options.
   - A07-A13: Use the 1–5 self-rating sliders (tracked for correlation against actual scores).
6. Click **"Proceed to Part B"** to enter Exam CBT mode.

### 3. Student Experience: Exam CBT Mode (Parts B & C) (3 minutes)
1. You are now on **Section B1 (Quantitative Aptitude)**:
   - Notice the server countdown timer (28:00) in the header.
   - Notice the **+1 / -0.25 marking scheme indicator**.
2. **Answer Q01**: Tap option `C` (`120`). A confidence tag bar appears: tap **"Sure"**.
3. **Answer Q02**: Tap option `B` (`60`), tag **"Maybe"**.
4. **Try the Rough-work Notepad**:
   - Tap the **"Rough Notepad"** button in the top navigation.
   - Write notes (e.g., `Q02: 3x + 5x = 160 => 8x=160 => x=20 => smaller = 60`).
   - Notice the green "Saved" tick. Close the modal.
5. **Set-based Question Test**:
   - Click question `21` in the question palette.
   - Observe the **Data Interpretation table** (`DI1`) displayed side-by-side on desktop or stacked on mobile.
6. **Review Modal & Section Submit**:
   - Click **"Review & Submit Section"**.
   - Review answered (green), marked (amber), and unattempted (slate) counts.
   - Click **"Lock & Submit Section"**.
   - Section B1 is locked; the app advances to B2.

### 4. Buffer Test (Simulated or Manual) (1 minute)
- If a section expires at 0:00, the system automatically prompts: *"Section Time Expired — Use Pooled Buffer?"*.
- The candidate can spend minutes from the 20-minute buffer or move directly to the next section.
- Buffer time used is tracked in the database and displayed in the mentor dossier.

### 5. Mentor Analytics & 1-Click Export (1 minute)
1. Return to the mentor admin tab (`/admin`).
2. Click on candidate `Ananya Verma` to open the **Candidate Diagnostic Dossier**.
3. Observe:
   - **Section Scorecards**: Questions attempted, correct, wrong, net score (+1 / -0.25), accuracy, and attempt rate.
   - **Topic Mastery Heatmap**: Categorized into Green (>=70%), Amber (40-69%), and Red (<40%).
   - **Confidence Calibration Matrix**: Breakdown of Sure, Maybe, and Guess against correct/wrong answers.
   - **Self-Rating vs. Reality**: Candidate's self-assessed confidence compared to actual section accuracy.
   - **Verbatim Answers & Word Counts**: Full text of descriptive answers (SD1, SD2, FS1, W1, W2) with word-count limits.
   - **Integrity Log**: Friendly record of tab focus/blur, viewport changes, and time visible.
4. **Export Data**:
   - Click **"Download JSON Bundle"**: Downloads `attempt-Ananya_Verma-<date>.json` containing complete metrics, timing, verbatim text, and profile data.
   - Click **"Export Flat CSV"**: Downloads `attempt-Ananya_Verma-<date>.csv` containing per-question rows (`id, section, topic, diff, correct, selected, confidence, time_seconds, visits, changes`).

---

## 7. Design Decisions & Assumptions

1. **Server-Authoritative Time Calculation**:
   - Elapsed section time is computed as `(Date.now() - startedAt.getTime()) / 1000`. If a candidate closes the tab, network drops, or reloads, time continues to count down realistically, preventing tampering.
2. **Buffer Activation**:
   - When a timed section reaches 0:00, the client locks question inputs and prompts the candidate. If the candidate activates the buffer, remaining buffer seconds are assigned to that section.
3. **Dynamic Reflection (`D01`) Item Picker**:
   - Server-side algorithm selects 6 earlier MCQs: 2 correct with *Sure*, 2 wrong with *Sure* or *Maybe*, and 2 skipped or tagged *Guess*. If a candidate does not have enough answers in a specific category (e.g. perfect score with no wrong answers), the pool automatically draws from available responses to guarantee 6 reflection prompts (`D01a` through `D01f`).
4. **Diagnostic Framing**:
   - The student finish screen offers encouraging closure and explains that the mentor will review the diagnostic. No scores, correct answers, or percentile ratings are shown to the candidate.
5. **No Analytics or Third-Party Trackers**:
   - Zero third-party telemetry or tracking scripts are embedded. Candidate responses and behavior logs are saved strictly to the mentor's private database.

---

## 8. License & Attribution

Designed and engineered for RBI Grade B aspirant diagnostic assessment. Content based on `rbi_baseline_questions.json`.
