import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { addAttempt, loadAttempts, saveAttempts, type Attempt } from '../judge/storage';
import { fetchAttempts, mergeAttempts, saveAttempt } from './sync/attempts';
import { fetchProgress, saveRemoteProgress } from './sync/progress';
import {
  clearProgress,
  completedLessonIds,
  emptyProgress,
  loadProgress,
  mergeProgress,
  PROGRESS_STORAGE_KEY,
  recordLessonResult,
  saveProgress,
  type ProgressState,
} from './progress';

interface ProgressContextValue {
  attempts: Attempt[];
  progress: ProgressState;
  /** Ids of completed lessons. */
  doneLessons: Set<string>;
  recordAttempt: (attempt: Attempt) => void;
  recordLesson: (lessonId: string, correct: boolean) => void;
  /** Forgets this browser's progress. Used on sign-out so the next person starts clean. */
  resetLocal: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const REMOTE_SAVE_DELAY_MS = 800;

/**
 * One place for everything the learner has done: lesson answers and coding attempts.
 * Saved in this browser always, and in the account when signed in. On sign-in the two are merged.
 */
export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts());
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  const saveTimer = useRef<number | undefined>(undefined);

  const scheduleRemoteSave = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const id = userIdRef.current;
      if (id) void saveRemoteProgress(id, progressRef.current);
    }, REMOTE_SAVE_DELAY_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  // On sign-in, bring in the account's history and merge it with this browser's.
  useEffect(() => {
    if (!user) return;
    let active = true;
    const userId = user.id;
    Promise.all([fetchAttempts(userId), fetchProgress(userId)]).then(([remoteAttempts, remoteProgress]) => {
      if (!active) return;
      if (remoteAttempts) {
        const local = loadAttempts();
        const merged = mergeAttempts(local, remoteAttempts);
        saveAttempts(merged);
        setAttempts(merged);
        // Work done before signing up now belongs to the account too.
        const known = new Set(remoteAttempts.map((a) => a.id));
        for (const a of merged) if (!known.has(a.id)) void saveAttempt(a, userId);
      }
      if (remoteProgress) {
        const merged = mergeProgress(progressRef.current, remoteProgress);
        saveProgress(merged);
        setProgress(merged);
        void saveRemoteProgress(userId, merged);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROGRESS_STORAGE_KEY) setProgress(loadProgress());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recordAttempt = useCallback((attempt: Attempt) => {
    setAttempts(addAttempt(attempt));
    const id = userIdRef.current;
    if (id) void saveAttempt(attempt, id);
  }, []);

  const recordLesson = useCallback(
    (lessonId: string, correct: boolean) => {
      const next = recordLessonResult(progressRef.current, lessonId, correct);
      progressRef.current = next;
      saveProgress(next);
      setProgress(next);
      if (userIdRef.current) scheduleRemoteSave();
    },
    [scheduleRemoteSave]
  );

  const resetLocal = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    clearProgress();
    saveAttempts([]);
    progressRef.current = emptyProgress();
    setProgress(progressRef.current);
    setAttempts([]);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({ attempts, progress, doneLessons: completedLessonIds(progress), recordAttempt, recordLesson, resetLocal }),
    [attempts, progress, recordAttempt, recordLesson, resetLocal]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
};

export function useProgressData(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgressData must be used inside ProgressProvider');
  return ctx;
}
