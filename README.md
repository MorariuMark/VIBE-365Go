# VIBE 365 | Performance Operating System

A dark-mode habit tracking, habit elimination, and progressive overload fitness operating system engineered for athletes and high performers. Built with Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons, and Recharts.

---

## Core Capabilities

### 1. Habits Engine and Activity Matrix
- **Daily Checklist**: Track routine habits with category tags, streak counters, and completion percentages.
- **Nested Subtasks**: Multi-step habit breakdown with individual completion state and progress ratios.
- **Custom Metrics**: Define quantitative targets per habit (minutes, words, pages, liters) with typed inputs.
- **Completions Quota**: Set required completion frequency per week or per month.
- **Expandable Daily Notes**: Per-day markdown reflection and notes for each habit.
- **Emerald Consistency Matrix**: 32-week GitHub-style activity grid measuring daily completion intensity with date tooltips and interactive selection.

### 2. Fitness Engine and Strength Curves
- **Weekly Schedule**: 7-day Monday-to-Sunday planner with target workouts per week.
- **PPL Workout Splits**: Structured Push, Pull, Legs presets with support for custom permanent or session-only muscle groups.
- **Drop Set Formula**: Log progressive overload sets with formula notation: `Weight (kg) x Reps + Drop Weight (kg) x Drop Reps`.
- **Daily Body Weight Tracker**: Record morning or post-workout weight with automatic delta comparison against previous sessions.
- **Sapphire Consistency Matrix**: Dedicated blue activity matrix tracking workout frequency and training volume.
- **Strength Curves and Analytics**: Interactive Recharts visualization tracking Top Working Weight, Total Volume, and Estimated 1RM (Brzycki formula).

### 3. Habit Breaker Elimination Engine
- **Structured Elimination Plans**: Define a multi-month elimination timeline (1, 2, 3, 4, or 6 months) to taper off unwanted habits.
- **Taper Curves**:
  - Linear: Uniform monthly reductions (e.g., 21 -> 14 -> 7 -> 0 days).
  - Gentle: Slower initial taper with steepened finish.
  - Aggressive: Front-loaded quota reduction.
  - Custom: User-defined monthly targets.
- **Dual Tracking Modes**:
  - Days Allowance: Restrict allowed days per month with remaining allowance counters and excess breach indicators.
  - Daily Metric Ceiling: Progressively lower quantitative ceilings (e.g., screen time in hours or spend).
- **iOS 3D Cylinder Time Picker**: Dual-drum combination lock picker for hours (0-23) and minutes (0-59) with 3D perspective transforms, scroll-wheel rotation, drag controls, and duration presets (30m, 1h, 2h 20m). Stores exact units and floating-point hour values.
- **Accidental Click Protection**: In-modal confirmation dialogs when logging or removing calendar execution days, displaying allowance impact before applying changes.
- **Clean Day Streaks**: Tracks consecutive days free from the target habit.

### 4. 30-Day Trash Can and Soft-Delete System
- **Non-Destructive Deletions**: Deleting habits, workout logs, objectives, or habit breakers stores them in a 30-day soft-delete holding table.
- **Retention Purge**: Automatic expiration calculation with purge of items older than 30 days.
- **Restoration**: One-click recovery restoring data structures back into active dashboard views.
- **Permanent Purge**: Immediate single-item purge or complete trash emptying.

### 5. Action Audit Ledger and Backend APIs
- **Immutable Audit Logging**: Captures every user modification with full ISO timestamps, action categories, and descriptive payloads.
- **Audit Viewer**: Searchable modal with action filters and one-click JSON export.
- **REST Endpoints**:
  - `GET /api/logs`: Query audit trail with limit and filter support.
  - `POST /api/logs`: Ingest external or client-side audit entries.
  - `GET /api/backup`: Export complete system state as JSON.
  - `POST /api/backup`: Restore system state from backup payload.

---

## Technical Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Visualizations**: Recharts
- **Storage**: Client-side storage layer with serverless JSON backup routes

---

## Project Structure

```
src/
|-- app/
|   |-- api/
|   |   |-- backup/route.ts        # Backup and restore API
|   |   `-- logs/route.ts          # Action audit ledger API
|   |-- globals.css                # Obsidian theme and typography
|   |-- layout.tsx                 # Root layout configuration
|   |-- page.tsx                   # Central performance dashboard
|   |-- error.tsx                  # Error boundary
|   |-- global-error.tsx           # Global root error boundary
|   `-- not-found.tsx              # 404 handler
|-- components/
|   |-- common/
|   |   |-- ActionLogModal.tsx     # Audit ledger viewer
|   |   |-- CylinderTimePicker.tsx # iOS combination wheel picker
|   |   |-- DataManagementModal.tsx# JSON import/export
|   |   `-- TrashCanModal.tsx      # 30-day soft delete manager
|   |-- breakers/
|   |   |-- CreateBreakerModal.tsx # Elimination plan wizard
|   |   |-- HabitBreakerBoard.tsx  # Habit breaker overview
|   |   `-- HabitBreakerCard.tsx   # Calendar tracking and breach alerts
|   |-- gym/
|   |   |-- DayWorkoutModal.tsx    # Workout and weight ledger
|   |   |-- ProgressCurves.tsx     # Strength curves and 1RM
|   |   `-- WeeklyCalendar.tsx     # Weekly training calendar
|   |-- habits/
|   |   |-- ContributionGrid.tsx   # Emerald and Sapphire matrices
|   |   |-- HabitCard.tsx          # Habit item with subtasks and notes
|   |   `-- HabitList.tsx          # Habits checklist
|   `-- objectives/
|       `-- ObjectiveBoard.tsx     # Multi-horizon objectives
|-- lib/
|   |-- initialData.ts             # Default configuration and initial seed
|   |-- storage.ts                 # Local storage and audit ledger helpers
|   `-- utils.ts                   # Date and numeric utilities
`-- types/
    `-- index.ts                   # Domain TypeScript models
```

---

## Getting Started

### Prerequisites
- Node.js 18.17 or higher
- npm 9.0 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MorariuMark/VIBE-365Go.git
   cd VIBE-365Go
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Or on Windows, run:
   ```cmd
   start-app.bat
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## License

MIT License. Engineered for personal performance optimization.
