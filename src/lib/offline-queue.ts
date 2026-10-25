export interface QueuedAnswer {
  id: string;
  token: string;
  payload: any;
  timestamp: number;
}

const STORAGE_KEY = 'rbi_offline_answer_queue';

export function getQueuedAnswers(): QueuedAnswer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueAnswer(token: string, payload: any): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getQueuedAnswers();
    // Replace existing item if same itemId
    const filtered = queue.filter((item) => item.payload.itemId !== payload.itemId);
    filtered.push({
      id: payload.clientEventId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      token,
      payload,
      timestamp: Date.now(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to queue answer locally:', e);
  }
}

export function dequeueAnswer(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getQueuedAnswers();
    const updated = queue.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to dequeue answer:', e);
  }
}

export async function flushOfflineQueue(token: string): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;
  const queue = getQueuedAnswers().filter((item) => item.token === token);
  let synced = 0;

  for (const item of queue) {
    try {
      const res = await fetch(`/api/attempt/${token}/save-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        dequeueAnswer(item.id);
        synced++;
      }
    } catch {
      // Still offline or failed request
      break;
    }
  }

  return synced;
}
