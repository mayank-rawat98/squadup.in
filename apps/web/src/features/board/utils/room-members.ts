import type { Peer } from '../hooks/use-presence';
import type { BoardMember, BoardRole } from '../types/board.types';
import { type PresenceColour, presenceColour, presenceIndex } from './presence';

export interface RoomMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: BoardRole;
  colour: PresenceColour;
  isYou: boolean;
  online: boolean;
  /** One line under the name: where they are, as words. */
  status: string;
  /** The tab to follow, when they're online and not you. */
  followable: boolean;
}

function whereabouts(peer: Peer | undefined): string {
  if (!peer) return 'Not here right now';
  if (peer.view === 'board') {
    return peer.drawing ? 'Drawing on the whiteboard' : 'On the whiteboard';
  }
  return peer.line ? `On line ${peer.line}` : 'In the room';
}

/**
 * The room's members with what each is doing now. Someone in the room who
 * isn't in the cached member list yet (they just joined) is listed too.
 */
export function roomMembers(
  members: readonly BoardMember[],
  peers: readonly Peer[],
  youId: string,
): RoomMember[] {
  const ids = members.map((m) => m.id);
  const peerOf = (id: string) => peers.find((p) => p.user.id === id);
  const newcomers = peers
    .filter((p) => !ids.includes(p.user.id))
    .filter((p, i, all) => all.findIndex((q) => q.user.id === p.user.id) === i)
    .map(
      (p): BoardMember => ({
        id: p.user.id,
        name: p.user.name,
        username: null,
        avatarUrl: null,
        role: 'member',
        joinedAt: '',
      }),
    );

  const all = [...members, ...newcomers];
  const order = all.map((m) => m.id);
  return all.map((member) => {
    const isYou = member.id === youId;
    const peer = peerOf(member.id);
    const where = isYou ? 'You' : whereabouts(peer);
    return {
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
      role: member.role,
      colour: presenceColour(presenceIndex(order, member.id)),
      isYou,
      online: isYou || Boolean(peer),
      status: member.role === 'host' ? `Host · ${where}` : where,
      followable: !isYou && Boolean(peer),
    };
  });
}
