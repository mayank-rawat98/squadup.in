/* Response shapes of the boards endpoints (apps/api boards.presenter). */

export type BoardLanguageId = 'cpp' | 'java' | 'python' | 'c' | 'javascript';

export type BoardRole = 'host' | 'member';

export interface BoardSummary {
  code: string;
  name: string;
  language: BoardLanguageId;
  seats: number;
  role: BoardRole;
  joinedAt: string;
  createdAt: string;
  closedAt: string | null;
}

export interface BoardPerson {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface BoardMember extends BoardPerson {
  role: BoardRole;
  joinedAt: string;
}

export interface BoardDetail extends BoardSummary {
  members: BoardMember[];
}

export interface BoardMessage {
  id: string;
  body: string;
  createdAt: string;
  author: BoardPerson;
}

export interface CreateBoardInput {
  name: string;
  language: BoardLanguageId;
  seats: number;
}
