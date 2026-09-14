# VIBE 365 | Habit Tracker & IronForge Gym Logger

A modern, responsive, high-performance web application designed for high performers and athletes. Integrates habit tracking with sub-tasks, multi-horizon strategic objectives, a GitHub-style consistency matrix, and a weekly progressive overload gym logger with drop-set formulas and strength curves.

Built with Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons, and Recharts.

---

## Key Features

### 1. Habits & Consistency Matrix
- **Daily Habit Tracker**: Track habits with interactive sub-task checklists, category pills, and streak indicators.
- **GitHub-Style Contribution Grid**: 32-week visual consistency matrix with green intensity squares (0%, 25%, 50%, 75%, 100%) tracking daily completion rate. Hover tooltips reveal exact habits and workout logs.
- **Optimistic Updates & Confetti**: Immediate visual feedback with celebratory particle effects.

### 2. Strategic Objectives Board
- Multi-horizon goals: **Daily**, **Weekly**, **Monthly**, and **Quarterly**.
- Interactive progress sliders, target values, units (kg, reps, L, days), and completion toggles.

### 3. IronForge Gym Tracker
- **Weekly Calendar View**: Week-by-week calendar slider with Monday–Sunday display and quick week navigation.
- **Workouts / Week Goal**: Set and track weekly workout targets (e.g. 4 days/week) with dynamic progress tracking.
- **Push / Pull / Legs (PPL) Splits**:
  - **Push Split**: Defaults to 3 muscle groups (Chest, Triceps, Shoulders) + option to add custom muscle groups.
  - **Pull Split**: Defaults to 2 muscle groups (Back, Biceps) + custom muscle groups.
  - **Legs Split**: Defaults to 2 muscle groups (Legs, Abs) + custom muscle groups.
  - **Custom Muscle Groups**: Option to add any muscle group either **for today only** or **permanent** in the library.
- **Sticky Exercise Library**: Add new exercises under any muscle group; once added, it sticks forever to that muscle group's library.
- **Sets & Reps Formula with Drop Sets**:
  - Standard set: `Weight (kg) × Reps` (e.g. `100kg × 12 reps`).
  - Drop sets: `+ Drop Weight (kg) × Drop Reps` (e.g. `+ 70kg × 5 reps`).
  - Duplicate set, mark set done, and reorder.
- **Dedicated Day Page/Modal**: Click any day in the weekly calendar or contribution grid to open the full session view with titles and notes.
- **Daily Body Weight Tracker**: Log daily morning or post-workout weight at the end of each day with delta comparisons against previous sessions.

### 4. Strength Curves & Automated Insights
- Interactive charts powered by Recharts.
- Toggle between **Top Working Weight**, **Estimated 1RM (Brzycki Formula)**, and **Total Volume (kg)**.
- Automated insight engine: e.g. "+20% weight increase over the past month", PR detection, and total volume progression.

### 5. Data Persistence & Export/Import
- Local storage sync engine with zero database setup required for instant usage.
- One-click **Export Backup (JSON)** and **Import Backup (JSON)**.
- Vercel-ready serverless API routes (`/api/backup`) with database compatibility (PostgreSQL / Neon / Supabase).

---

## Getting Started

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

### Vercel Deployment

1. Push your repository to GitHub / GitLab.
2. Import the project in the [Vercel Dashboard](https://vercel.com).
3. Framework Preset: **Next.js**.
4. Click **Deploy**.
