/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

export type QueueTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type QueueTask = {
  id: string;
  title: string;
  prompt: string;
  workspace: string;
  createdAt: string;
  updatedAt: string;
  status: QueueTaskStatus;
  lastError: string | null;
  lastResult: string | null;
};

export type WorkspaceQueueState = {
  version: number;
  workspace: string;
  workspaceHash: string;
  updatedAt: string;
  tasks: QueueTask[];
};

