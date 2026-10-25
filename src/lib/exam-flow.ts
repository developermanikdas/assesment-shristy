export interface SectionConfig {
  id: string;
  partId: string;
  title: string;
  timeMin: number;
  isTimed: boolean;
  isBreak: boolean;
  isSoftTimer: boolean;
}

export const EXAM_SECTIONS: SectionConfig[] = [
  { id: 'A', partId: 'A', title: 'Onboarding & Consent', timeMin: 10, isTimed: false, isBreak: false, isSoftTimer: true },
  { id: 'B1', partId: 'B', title: 'Quantitative Aptitude', timeMin: 28, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'B2', partId: 'B', title: 'Reasoning Ability', timeMin: 27, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'B3', partId: 'B', title: 'English Language', timeMin: 20, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'B4', partId: 'B', title: 'General Awareness', timeMin: 20, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'BREAK1', partId: 'BREAK1', title: 'Scheduled Rest Break', timeMin: 10, isTimed: true, isBreak: true, isSoftTimer: false },
  { id: 'C1', partId: 'C', title: 'Economic & Social Issues (Obj)', timeMin: 15, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'C2', partId: 'C', title: 'Economic & Social Issues (Desc)', timeMin: 25, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'C3', partId: 'C', title: 'Finance & Management', timeMin: 25, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'C4', partId: 'C', title: 'English Writing', timeMin: 25, isTimed: true, isBreak: false, isSoftTimer: false },
  { id: 'BREAK2', partId: 'BREAK2', title: 'Scheduled Rest Break', timeMin: 5, isTimed: true, isBreak: true, isSoftTimer: false },
  { id: 'D', partId: 'D', title: 'Thinking & Judgement', timeMin: 20, isTimed: false, isBreak: false, isSoftTimer: true },
  { id: 'E', partId: 'E', title: 'Personal Profile & Habits', timeMin: 20, isTimed: false, isBreak: false, isSoftTimer: true },
];

export function getNextSection(currentSectionId: string): SectionConfig | null {
  const index = EXAM_SECTIONS.findIndex((s) => s.id === currentSectionId);
  if (index === -1 || index >= EXAM_SECTIONS.length - 1) {
    return null;
  }
  return EXAM_SECTIONS[index + 1];
}

export function getSectionConfig(sectionId: string): SectionConfig | undefined {
  return EXAM_SECTIONS.find((s) => s.id === sectionId);
}

export interface ComputedTimerResult {
  sectionId: string;
  isTimed: boolean;
  isSoftTimer: boolean;
  status: 'not_started' | 'active' | 'buffer_active' | 'time_expired' | 'submitted' | 'locked';
  remainingSeconds: number;
  totalDurationSeconds: number;
  elapsedSeconds: number;
  bufferAvailableSeconds: number;
  bufferUsedInSectionSeconds: number;
  canUseBuffer: boolean;
  isBreak: boolean;
}

export function computeServerTimer(
  sectionConfig: SectionConfig,
  timerData: {
    startedAt?: Date | string;
    durationSeconds: number;
    bufferUsedSeconds: number;
    submittedAt?: Date | string;
    status: 'not_started' | 'active' | 'buffer_active' | 'submitted' | 'locked';
    bufferStartedAt?: Date | string;
  } | undefined,
  pooledBufferTotalSeconds: number = 1200,
  pooledBufferUsedSeconds: number = 0,
  now: Date = new Date()
): ComputedTimerResult {
  const isTimed = sectionConfig.isTimed;
  const isSoftTimer = sectionConfig.isSoftTimer;
  const isBreak = sectionConfig.isBreak;
  const totalPooledRemaining = Math.max(0, pooledBufferTotalSeconds - pooledBufferUsedSeconds);

  if (!timerData || !timerData.startedAt) {
    return {
      sectionId: sectionConfig.id,
      isTimed,
      isSoftTimer,
      status: 'not_started',
      remainingSeconds: sectionConfig.timeMin * 60,
      totalDurationSeconds: sectionConfig.timeMin * 60,
      elapsedSeconds: 0,
      bufferAvailableSeconds: totalPooledRemaining,
      bufferUsedInSectionSeconds: 0,
      canUseBuffer: isTimed && !isBreak && totalPooledRemaining > 0,
      isBreak,
    };
  }

  if (timerData.status === 'submitted' || timerData.status === 'locked') {
    return {
      sectionId: sectionConfig.id,
      isTimed,
      isSoftTimer,
      status: timerData.status,
      remainingSeconds: 0,
      totalDurationSeconds: timerData.durationSeconds,
      elapsedSeconds: timerData.durationSeconds,
      bufferAvailableSeconds: totalPooledRemaining,
      bufferUsedInSectionSeconds: timerData.bufferUsedSeconds || 0,
      canUseBuffer: false,
      isBreak,
    };
  }

  const startedMs = new Date(timerData.startedAt).getTime();
  const nowMs = now.getTime();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  const baseRemaining = Math.max(0, timerData.durationSeconds - elapsedSeconds);

  // If buffer is currently active for this section
  if (timerData.status === 'buffer_active') {
    const bufferStartMs = timerData.bufferStartedAt ? new Date(timerData.bufferStartedAt).getTime() : nowMs;
    const currentBufferElapsed = Math.max(0, Math.floor((nowMs - bufferStartMs) / 1000));
    const effectiveBufferRemaining = Math.max(0, totalPooledRemaining - currentBufferElapsed);

    if (effectiveBufferRemaining <= 0) {
      // Buffer fully exhausted
      return {
        sectionId: sectionConfig.id,
        isTimed,
        isSoftTimer,
        status: 'time_expired',
        remainingSeconds: 0,
        totalDurationSeconds: timerData.durationSeconds,
        elapsedSeconds,
        bufferAvailableSeconds: 0,
        bufferUsedInSectionSeconds: (timerData.bufferUsedSeconds || 0) + totalPooledRemaining,
        canUseBuffer: false,
        isBreak,
      };
    }

    return {
      sectionId: sectionConfig.id,
      isTimed,
      isSoftTimer,
      status: 'buffer_active',
      remainingSeconds: effectiveBufferRemaining,
      totalDurationSeconds: timerData.durationSeconds,
      elapsedSeconds,
      bufferAvailableSeconds: effectiveBufferRemaining,
      bufferUsedInSectionSeconds: (timerData.bufferUsedSeconds || 0) + currentBufferElapsed,
      canUseBuffer: true,
      isBreak,
    };
  }

  // Soft timer (Parts A, D, E): never auto-submits, displays elapsed or gentle count
  if (isSoftTimer) {
    return {
      sectionId: sectionConfig.id,
      isTimed: false,
      isSoftTimer: true,
      status: 'active',
      remainingSeconds: Math.max(0, timerData.durationSeconds - elapsedSeconds),
      totalDurationSeconds: timerData.durationSeconds,
      elapsedSeconds,
      bufferAvailableSeconds: totalPooledRemaining,
      bufferUsedInSectionSeconds: 0,
      canUseBuffer: false,
      isBreak: false,
    };
  }

  // Timed section (Parts B & C, Breaks)
  if (baseRemaining <= 0) {
    return {
      sectionId: sectionConfig.id,
      isTimed: true,
      isSoftTimer: false,
      status: 'time_expired',
      remainingSeconds: 0,
      totalDurationSeconds: timerData.durationSeconds,
      elapsedSeconds,
      bufferAvailableSeconds: totalPooledRemaining,
      bufferUsedInSectionSeconds: timerData.bufferUsedSeconds || 0,
      canUseBuffer: !isBreak && totalPooledRemaining > 0,
      isBreak,
    };
  }

  return {
    sectionId: sectionConfig.id,
    isTimed: true,
    isSoftTimer: false,
    status: 'active',
    remainingSeconds: baseRemaining,
    totalDurationSeconds: timerData.durationSeconds,
    elapsedSeconds,
    bufferAvailableSeconds: totalPooledRemaining,
    bufferUsedInSectionSeconds: timerData.bufferUsedSeconds || 0,
    canUseBuffer: !isBreak && totalPooledRemaining > 0,
    isBreak,
  };
}
