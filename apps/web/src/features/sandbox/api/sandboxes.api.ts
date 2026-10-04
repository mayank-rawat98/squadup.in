import { apiClient, type Paginated } from '@/lib/api';
import type {
  CreateSandboxInput,
  SandboxDetail,
  SandboxSummary,
  UpdateSandboxInput,
} from '../types/sandbox.types';

/* The sandboxes endpoints (apps/api sandboxes.controller). */

const sandboxUrl = (id: string) => `/sandboxes/${encodeURIComponent(id)}`;

export function createSandbox(
  input: CreateSandboxInput,
): Promise<SandboxDetail> {
  return apiClient.request<SandboxDetail>('/sandboxes', {
    method: 'POST',
    body: input,
  });
}

/** List endpoints put the page fields beside `data`, so read the envelope. */
export async function listSandboxes(
  signal?: AbortSignal,
): Promise<Paginated<SandboxSummary>> {
  return (await apiClient.requestEnvelope<SandboxSummary[]>(
    '/sandboxes?limit=50',
    { signal },
  )) as unknown as Paginated<SandboxSummary>;
}

export function getSandbox(
  id: string,
  signal?: AbortSignal,
): Promise<SandboxDetail> {
  return apiClient.request<SandboxDetail>(sandboxUrl(id), { signal });
}

export function updateSandbox(
  id: string,
  input: UpdateSandboxInput,
): Promise<SandboxSummary> {
  return apiClient.request<SandboxSummary>(sandboxUrl(id), {
    method: 'PATCH',
    body: input,
  });
}

export function deleteSandbox(id: string): Promise<null> {
  return apiClient.request<null>(sandboxUrl(id), { method: 'DELETE' });
}
