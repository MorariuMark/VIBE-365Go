import { AppDataBackup } from '@/types';
import { ContextOptions, ContextPayload } from './types';
import { getTodayISO } from '@/lib/utils';

/**
 * Computes start and end ISO dates based on the requested timeframe.
 */
export function resolveDateRange(
  timeframe: ContextOptions['timeframe'],
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const today = getTodayISO();
  const now = new Date();

  if (timeframe === 'today') {
    return { startDate: today, endDate: today, label: `Today (${today})` };
  }

  if (timeframe === 'week') {
    const past7 = new Date(now);
    past7.setDate(now.getDate() - 7);
    const start = past7.toISOString().split('T')[0];
    return { startDate: start, endDate: today, label: `Past 7 Days (${start} to ${today})` };
  }

  if (timeframe === 'month') {
    const past30 = new Date(now);
    past30.setDate(now.getDate() - 30);
    const start = past30.toISOString().split('T')[0];
    return { startDate: start, endDate: today, label: `Past 30 Days (${start} to ${today})` };
  }

  if (timeframe === 'quarter') {
    const past90 = new Date(now);
    past90.setDate(now.getDate() - 90);
    const start = past90.toISOString().split('T')[0];
    return { startDate: start, endDate: today, label: `Past Quarter / 90 Days (${start} to ${today})` };
  }

  if (timeframe === 'custom' && customStart && customEnd) {
    return {
      startDate: customStart,
      endDate: customEnd,
      label: `Custom Range (${customStart} to ${customEnd})`,
    };
  }

  // 'all'
  return { startDate: '1970-01-01', endDate: '2099-12-31', label: 'All-Time App History' };
}

/**
 * Builds context payload from the live AppDataBackup based on the user's granular filters.
 */
export function buildAppContext(data: AppDataBackup, options: ContextOptions): ContextPayload {
  const { startDate, endDate, label: timeframeLabel } = resolveDateRange(
    options.timeframe,
    options.startDate,
    options.endDate
  );

  const sections = options.sections;
  const itemCounts = {
    habits: 0,
    workouts: 0,
    breakers: 0,
    objectives: 0,
    actions: 0,
    tasks: 0,
    sleep: 0,
  };

  // --- RAW JSON DUMP MODE ---
  if (options.includeRawJsonDump || options.format === 'json') {
    const jsonContext: Record<string, any> = {
      meta: {
        exportTimestamp: new Date().toISOString(),
        timeframe: options.timeframe,
        dateRange: { startDate, endDate },
      },
    };

    if (sections.includes('habits')) {
      const filteredHabits = (data.habits || []).map((h) => {
        // Filter history by date range
        const filteredHistory: Record<string, boolean> = {};
        let completionsInRange = 0;
        Object.entries(h.history || {}).forEach(([d, done]) => {
          if (d >= startDate && d <= endDate && done) {
            filteredHistory[d] = true;
            completionsInRange++;
          }
        });

        // Filter daily metric values
        const filteredMetrics: Record<string, any> = {};
        Object.entries(h.dailyMetricValues || {}).forEach(([d, vals]) => {
          if (d >= startDate && d <= endDate) {
            filteredMetrics[d] = vals;
          }
        });

        // Filter daily notes
        const filteredNotes: Record<string, string> = {};
        Object.entries(h.dailyNotes || {}).forEach(([d, note]) => {
          if (d >= startDate && d <= endDate) {
            filteredNotes[d] = note;
          }
        });

        return {
          id: h.id,
          title: h.title,
          category: h.category,
          currentStreak: h.streak,
          bestStreak: h.bestStreak,
          completionsInRange,
          history: filteredHistory,
          metricsConfig: h.metrics,
          dailyMetricValues: filteredMetrics,
          dailyNotes: filteredNotes,
          subtasks: h.subtasks,
        };
      });
      jsonContext.habits = filteredHabits;
      itemCounts.habits = filteredHabits.length;
    }

    if (sections.includes('fitness')) {
      const filteredWorkouts: Record<string, any> = {};
      Object.entries(data.workoutLogs || {}).forEach(([d, log]) => {
        if (d >= startDate && d <= endDate) {
          filteredWorkouts[d] = log;
        }
      });
      jsonContext.workoutLogs = filteredWorkouts;
      jsonContext.gymProfile = data.gymProfile;
      itemCounts.workouts = Object.keys(filteredWorkouts).length;
    }

    if (sections.includes('breakers')) {
      const filteredBreakers = (data.habitBreakers || []).map((b) => {
        const filteredLogs: Record<string, any> = {};
        Object.entries(b.logs || {}).forEach(([d, l]) => {
          if (d >= startDate && d <= endDate) {
            filteredLogs[d] = l;
          }
        });
        return {
          ...b,
          logs: filteredLogs,
        };
      });
      jsonContext.habitBreakers = filteredBreakers;
      itemCounts.breakers = filteredBreakers.length;
    }

    if (sections.includes('objectives')) {
      jsonContext.objectives = data.objectives || [];
      itemCounts.objectives = (data.objectives || []).length;
    }

    if (sections.includes('actions')) {
      const filteredActions = (data.actionLogs || []).filter((a) => {
        const actionDate = a.timestamp?.slice(0, 10);
        return actionDate ? actionDate >= startDate && actionDate <= endDate : true;
      });
      jsonContext.actionLogs = filteredActions;
      itemCounts.actions = filteredActions.length;
    }

    if (sections.includes('tasks')) {
      jsonContext.activeTasks = data.tasks || [];
      const filteredCompleted = (data.completedTasks || []).filter((t) => {
        const d = t.completedAt?.slice(0, 10) || t.deadline;
        return d >= startDate && d <= endDate;
      });
      jsonContext.completedTasks = filteredCompleted;
      itemCounts.tasks = (data.tasks || []).length;
    }

    if (sections.includes('sleep')) {
      const filteredSleep: Record<string, any> = {};
      Object.entries(data.sleepLogs || {}).forEach(([d, log]) => {
        if (d >= startDate && d <= endDate) {
          filteredSleep[d] = log;
        }
      });
      jsonContext.sleepLogs = filteredSleep;
      itemCounts.sleep = Object.keys(filteredSleep).length;
    }

    const rawJsonStr = JSON.stringify(jsonContext, null, 2);
    const estimatedTokens = Math.ceil(rawJsonStr.length / 3.8);

    return {
      summaryText: `\`\`\`json\n${rawJsonStr}\n\`\`\``,
      estimatedTokens,
      characterCount: rawJsonStr.length,
      sectionsIncluded: sections,
      timeframeLabel,
      itemCounts,
    };
  }

  // --- STRUCTURED MARKDOWN SUMMARY MODE ---
  const lines: string[] = [];
  lines.push(`### VIBE 365 User Context Data (${timeframeLabel})`);
  lines.push(`Exported on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`);

  // 1. HABITS SECTION
  if (sections.includes('habits') && data.habits) {
    lines.push(`#### 📈 HABIT PERFORMANCE & STREAKS (${data.habits.length} Tracked)`);
    data.habits.forEach((h) => {
      let completionsInRange = 0;
      Object.entries(h.history || {}).forEach(([d, done]) => {
        if (d >= startDate && d <= endDate && done) {
          completionsInRange++;
        }
      });

      const todayStatus = h.history?.[getTodayISO()] ? 'DONE TODAY' : 'PENDING TODAY';
      lines.push(
        `- **${h.title}** [${h.category.toUpperCase()}]: Current Streak: **${h.streak}d** | Best: **${
          h.bestStreak
        }d** | Range Completions: **${completionsInRange}** | Today: *${todayStatus}*`
      );

      // Subtasks
      if (h.subtasks && h.subtasks.length > 0) {
        const subCount = h.subtasks.filter((s) => s.completed).length;
        lines.push(`  - Subtasks: ${subCount}/${h.subtasks.length} completed`);
      }

      // Recent notes if any
      const recentNotes: string[] = [];
      Object.entries(h.dailyNotes || {}).forEach(([d, n]) => {
        if (d >= startDate && d <= endDate && n.trim()) {
          recentNotes.push(`${d}: "${n.trim()}"`);
        }
      });
      if (recentNotes.length > 0) {
        lines.push(`  - Notes: ${recentNotes.slice(-3).join('; ')}`);
      }
    });
    lines.push('');
    itemCounts.habits = data.habits.length;
  }

  // 2. FITNESS & WORKOUTS SECTION
  if (sections.includes('fitness') && data.workoutLogs) {
    const workoutsInRange = Object.entries(data.workoutLogs)
      .filter(([d]) => d >= startDate && d <= endDate)
      .sort((a, b) => b[0].localeCompare(a[0]));

    lines.push(
      `#### 🏋️ FITNESS & TRAINING PROGRESS (${workoutsInRange.length} Sessions in Range)`
    );

    if (data.gymProfile) {
      lines.push(
        `- Profile: Goal: ${data.gymProfile.workoutsPerWeekGoal}x/week | Split: ${data.gymProfile.preferredSplit.toUpperCase()} | Unit: ${
          data.gymProfile.preferredWeightUnit
        }`
      );
    }

    if (workoutsInRange.length === 0) {
      lines.push(`- No workout sessions logged during this period.`);
    } else {
      workoutsInRange.forEach(([date, log]) => {
        let totalVolumeKg = 0;
        let totalSets = 0;
        const exerciseSummaries: string[] = [];

        (log.exercises || []).forEach((ex) => {
          let exMaxWeight = 0;
          let exSets = 0;
          (ex.sets || []).forEach((s) => {
            if (s.completed) {
              totalVolumeKg += (s.weightKg || 0) * (s.reps || 0);
              totalSets++;
              exSets++;
              if (s.weightKg > exMaxWeight) exMaxWeight = s.weightKg;
            }
          });
          exerciseSummaries.push(
            `${ex.exerciseName} (${exSets} sets, top: ${exMaxWeight}${data.gymProfile?.preferredWeightUnit || 'kg'})`
          );
        });

        lines.push(
          `- **${date}** - "${log.title || 'Workout'}" [${log.splitType.toUpperCase()}]: ${
            log.completed ? '✅ Completed' : '⏳ Incomplete'
          }${log.bodyWeightKg ? ` | Bodyweight: ${log.bodyWeightKg}kg` : ''}${
            log.durationMinutes ? ` | Duration: ${log.durationMinutes}m` : ''
          } | Volume: ${totalVolumeKg.toLocaleString()}kg (${totalSets} sets)`
        );

        if (exerciseSummaries.length > 0) {
          lines.push(`  - Key Exercises: ${exerciseSummaries.slice(0, 4).join(', ')}`);
        }
        if (log.notes) {
          lines.push(`  - Session Notes: "${log.notes}"`);
        }
      });
    }
    lines.push('');
    itemCounts.workouts = workoutsInRange.length;
  }

  // 3. HABIT BREAKERS SECTION
  if (sections.includes('breakers') && data.habitBreakers) {
    lines.push(`#### 🛡️ HABIT ELIMINATION / BREAKERS (${data.habitBreakers.length} Active)`);
    data.habitBreakers.forEach((b) => {
      let daysExecuted = 0;
      let totalMetricTime = 0;
      Object.entries(b.logs || {}).forEach(([d, l]) => {
        if (d >= startDate && d <= endDate && l.executed) {
          daysExecuted++;
          if (l.metricHours || l.metricMinutes) {
            totalMetricTime += (l.metricHours || 0) * 60 + (l.metricMinutes || 0);
          } else if (l.metricValue) {
            totalMetricTime += l.metricValue;
          }
        }
      });

      const todayLog = b.logs?.[getTodayISO()];
      const todayStatus = todayLog?.executed ? 'EXECUTED TODAY' : 'CLEAN TODAY';

      lines.push(
        `- **${b.title}** (${b.durationMonths}m plan, ${b.aggressiveness}): Days executed in range: **${daysExecuted}** | Today: *${todayStatus}*`
      );
      if (b.metricUnit && totalMetricTime > 0) {
        lines.push(`  - Quantitative burden logged: ${totalMetricTime} ${b.metricUnit}`);
      }
    });
    lines.push('');
    itemCounts.breakers = data.habitBreakers.length;
  }

  // 4. OBJECTIVES SECTION
  if (sections.includes('objectives') && data.objectives) {
    lines.push(`#### 🎯 STRATEGIC OBJECTIVES (${data.objectives.length} Tracked)`);
    data.objectives.forEach((obj) => {
      lines.push(
        `- **${obj.title}** [${obj.timeframe.toUpperCase()}]: Progress: **${obj.progress}%** | Due: ${
          obj.dueDate
        } | Status: ${obj.completed ? '✅ Achieved' : '🎯 In Progress'}${
          obj.targetValue ? ` (Target: ${obj.currentValue || 0}/${obj.targetValue} ${obj.unit || ''})` : ''
        }`
      );
      if (obj.notes) {
        lines.push(`  - Context: "${obj.notes}"`);
      }
    });
    lines.push('');
    itemCounts.objectives = data.objectives.length;
  }

  // 5. ACTION AUDIT LEDGER SECTION
  if (sections.includes('actions') && data.actionLogs) {
    const recentActions = data.actionLogs
      .filter((a) => {
        const actionDate = a.timestamp?.slice(0, 10);
        return actionDate ? actionDate >= startDate && actionDate <= endDate : true;
      })
      .slice(-8);

    lines.push(`#### 📜 RECENT ACTION AUDIT TRAIL (${recentActions.length} Records)`);
    recentActions.forEach((a) => {
      lines.push(`- [${a.timestamp.slice(0, 16).replace('T', ' ')}] ${a.details}`);
    });
    lines.push('');
    itemCounts.actions = recentActions.length;
  }

  // 6. TASKS & DEADLINES SECTION
  if (sections.includes('tasks')) {
    const activeTasks = data.tasks || [];
    const completedTasksInRange = (data.completedTasks || []).filter((t) => {
      const d = t.completedAt?.slice(0, 10) || t.deadline;
      return d >= startDate && d <= endDate;
    });

    lines.push(`#### 📋 TASKS & DEADLINES (${activeTasks.length} Pending, ${completedTasksInRange.length} Completed in Range)`);
    if (activeTasks.length === 0) {
      lines.push(`- No pending tasks in queue.`);
    } else {
      activeTasks.forEach((t) => {
        const isOverdue = t.deadline < getTodayISO();
        const isToday = t.deadline === getTodayISO();
        const statusLabel = isOverdue ? '⚠️ OVERDUE' : isToday ? '🚨 DUE TODAY' : `Due ${t.deadline}`;
        lines.push(`- [${statusLabel}] **${t.title}** (Priority: ${t.priority || 'medium'})${t.notes ? ` - "${t.notes}"` : ''}`);
      });
    }
    if (completedTasksInRange.length > 0) {
      lines.push(`  - Completed Recently: ${completedTasksInRange.slice(0, 5).map((t) => `"${t.title}"`).join(', ')}`);
    }
    lines.push('');
    itemCounts.tasks = activeTasks.length;
  }

  // 7. SLEEP & RECOVERY SECTION
  if (sections.includes('sleep')) {
    const sleepInRange = Object.entries(data.sleepLogs || {})
      .filter(([d]) => d >= startDate && d <= endDate)
      .sort((a, b) => b[0].localeCompare(a[0]));

    lines.push(`#### 🌙 SLEEP RECOVERY & REST ARCHITECTURE (${sleepInRange.length} Logs in Range)`);
    if (sleepInRange.length === 0) {
      lines.push(`- No sleep logs recorded for this observation window.`);
    } else {
      const totalHours = sleepInRange.reduce((acc, [, s]) => acc + (s.durationHours || 0), 0);
      const avgHours = (totalHours / sleepInRange.length).toFixed(1);
      lines.push(`- Average Sleep: **${avgHours} hrs/night** (Target: ${data.settings?.sleepTargetHours || 8.0} hrs)`);

      sleepInRange.slice(0, 7).forEach(([date, log]) => {
        lines.push(
          `- **${date}**: **${log.durationHours}h** sleep (${log.bedtime} → ${log.wakeTime})${
            log.qualityScore ? ` | Score: ${log.qualityScore}/100` : ''
          }${log.notes ? ` | Notes: "${log.notes}"` : ''}`
        );
      });
    }
    lines.push('');
    itemCounts.sleep = sleepInRange.length;
  }

  const summaryText = lines.join('\n');
  const characterCount = summaryText.length;
  const estimatedTokens = Math.ceil(characterCount / 3.8);

  return {
    summaryText,
    estimatedTokens,
    characterCount,
    sectionsIncluded: sections,
    timeframeLabel,
    itemCounts,
  };
}
