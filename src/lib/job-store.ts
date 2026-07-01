export type JobStatus = "inquiring" | "available" | "hired" | "job_done" | "completed" | "cancelled";

export type ChatMessage = {
  id: string;
  sender: "tenant" | "worker";
  text: string;
  timestamp: number;
};

export type JobThread = {
  id: string;
  workerId: string;
  tenantId: string;
  workerName: string;
  workerInitials: string;
  tenantName: string;
  tenantInitials: string;
  workerProfilePic: string;
  title: string;
  message: string;
  budget: string;
  status: JobStatus;
  messages: ChatMessage[];
  upfrontPaid: boolean;
  paymentDeadline: number | null;
  createdAt: number;
};

const STORAGE_KEY = "rentme_job_threads";

function load(): JobThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(threads: JobThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {}
}

export function getThreads(): JobThread[] {
  return load();
}

export function getThread(id: string): JobThread | undefined {
  return load().find((t) => t.id === id);
}

export function createThread(opts: {
  workerId: string;
  workerName: string;
  workerInitials: string;
  workerProfilePic: string;
  title: string;
  message: string;
  budget: string;
}): JobThread {
  const threads = load();
  const thread: JobThread = {
    id: `thread-${Date.now()}`,
    workerId: opts.workerId,
    tenantId: "tenant-1",
    workerName: opts.workerName,
    workerInitials: opts.workerInitials,
    tenantName: "You",
    tenantInitials: "YO",
    workerProfilePic: opts.workerProfilePic,
    title: opts.title,
    message: opts.message,
    budget: opts.budget,
    status: "inquiring",
    messages: [
      {
        id: `msg-${Date.now()}`,
        sender: "tenant",
        text: opts.message,
        timestamp: Date.now(),
      },
    ],
    upfrontPaid: false,
    paymentDeadline: null,
    createdAt: Date.now(),
  };
  threads.unshift(thread);
  save(threads);
  return thread;
}

export function addMessage(threadId: string, sender: "tenant" | "worker", text: string): JobThread | null {
  const threads = load();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;
  thread.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender,
    text,
    timestamp: Date.now(),
  });
  save(threads);
  return thread;
}

export function updateStatus(threadId: string, status: JobStatus): JobThread | null {
  const threads = load();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;
  thread.status = status;
  save(threads);
  return thread;
}

export function markUpfrontPaid(threadId: string): JobThread | null {
  const threads = load();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;
  thread.upfrontPaid = true;
  thread.status = "hired";
  save(threads);
  return thread;
}

export function setPaymentDeadline(threadId: string): JobThread | null {
  const threads = load();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;
  thread.paymentDeadline = Date.now() + 20 * 60 * 1000;
  thread.status = "job_done";
  save(threads);
  return thread;
}
