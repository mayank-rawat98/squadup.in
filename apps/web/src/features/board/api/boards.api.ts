import { apiClient, type Paginated } from '@/lib/api';
import type {
  BoardDetail,
  BoardMessage,
  BoardSummary,
  CreateBoardInput,
  StartRoomSandboxInput,
} from '../types/board.types';

/* The boards endpoints (apps/api boards.controller). */

export function createBoard(input: CreateBoardInput): Promise<BoardDetail> {
  return apiClient.request<BoardDetail>('/boards', {
    method: 'POST',
    body: input,
  });
}

export function joinBoard(code: string): Promise<BoardDetail> {
  return apiClient.request<BoardDetail>('/boards/join', {
    method: 'POST',
    body: { code },
  });
}

export function getBoard(
  code: string,
  signal?: AbortSignal,
): Promise<BoardDetail> {
  return apiClient.request<BoardDetail>(`/boards/${encodeURIComponent(code)}`, {
    signal,
  });
}

/** List endpoints put the page fields beside `data`, so read the envelope. */
export async function listBoards(
  signal?: AbortSignal,
): Promise<Paginated<BoardSummary>> {
  return (await apiClient.requestEnvelope<BoardSummary[]>('/boards?limit=20', {
    signal,
  })) as unknown as Paginated<BoardSummary>;
}

/** The latest page of chat, newest first. */
export async function getBoardMessages(
  code: string,
  signal?: AbortSignal,
): Promise<Paginated<BoardMessage>> {
  return (await apiClient.requestEnvelope<BoardMessage[]>(
    `/boards/${encodeURIComponent(code)}/messages?limit=50`,
    { signal },
  )) as unknown as Paginated<BoardMessage>;
}

/** Starts the room's shared React project; everyone in the room hears `sandbox:ready`. */
export function startRoomSandbox(
  code: string,
  input: StartRoomSandboxInput,
): Promise<null> {
  return apiClient.request<null>(
    `/boards/${encodeURIComponent(code)}/sandbox`,
    { method: 'POST', body: input },
  );
}
