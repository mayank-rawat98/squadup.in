import type { User } from '../users/entities/user.entity';
import type { Board, BoardMember, BoardMessage } from './entities';

/*
 * Response shapes for the coding board. A board is addressed by its room
 * code; its uuid and the host's id stay inside the API. Member ids are shared
 * because the room matches them to live presence and cursors.
 */

type PublicUser = Pick<User, 'id' | 'fullName' | 'username' | 'avatarUrl'>;

/** What the room calls a person: their name, else their handle. */
export function displayName(user: PublicUser): string {
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;
  return user.username ? `@${user.username}` : 'SquadUp member';
}

function toPerson(user: PublicUser) {
  return {
    id: user.id,
    name: displayName(user),
    username: user.username ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function toBoardSummary(board: Board, membership: BoardMember) {
  return {
    code: board.code,
    name: board.name,
    language: board.language,
    seats: board.seats,
    role: membership.role,
    joinedAt: membership.joinedAt,
    createdAt: board.createdAt,
    closedAt: board.closedAt,
  };
}

export function toBoardMember(member: BoardMember) {
  return {
    ...toPerson(member.user),
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

export function toBoardDetail(
  board: Board,
  membership: BoardMember,
  members: BoardMember[],
) {
  return {
    ...toBoardSummary(board, membership),
    members: members.map(toBoardMember),
  };
}

export function toBoardMessage(message: BoardMessage) {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    author: toPerson(message.author),
  };
}
