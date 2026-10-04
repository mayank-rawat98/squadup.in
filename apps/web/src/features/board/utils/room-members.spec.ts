/** @jest-environment node */
import type { Peer } from '../hooks/use-presence';
import type { BoardMember } from '../types/board.types';
import { roomMembers } from './room-members';

const member = (
  id: string,
  name: string,
  role: BoardMember['role'] = 'member',
): BoardMember => ({
  id,
  name,
  username: null,
  avatarUrl: null,
  role,
  joinedAt: '2026-10-04T10:00:00.000Z',
});

const peer = (id: string, name: string, patch: Partial<Peer> = {}): Peer => ({
  clientId: id.length,
  user: { id, name, color: 'c', colorLight: 'c' },
  view: 'code',
  ...patch,
});

const members = [
  member('host', 'Aarav Joshi', 'host'),
  member('me', 'Diya Shah'),
  member('kabir', 'Kabir Mehta'),
  member('meera', 'Meera Iyer'),
];

describe('roomMembers', () => {
  it('says where each person is, in words', () => {
    const result = roomMembers(
      members,
      [
        peer('host', 'Aarav Joshi', { view: 'board' }),
        peer('kabir', 'Kabir Mehta', { line: 12 }),
      ],
      'me',
    );

    expect(
      result.map((m) => [m.name, m.status, m.online, m.followable]),
    ).toEqual([
      ['Aarav Joshi', 'Host · On the whiteboard', true, true],
      ['Diya Shah', 'You', true, false],
      ['Kabir Mehta', 'On line 12', true, true],
      ['Meera Iyer', 'Not here right now', false, false],
    ]);
  });

  it('says when someone is drawing', () => {
    const [host] = roomMembers(
      members,
      [peer('host', 'Aarav Joshi', { view: 'board', drawing: true })],
      'me',
    );
    expect(host.status).toBe('Host · Drawing on the whiteboard');
  });

  it('says which React project file someone has open', () => {
    const [host, , kabir] = roomMembers(
      members,
      [
        peer('host', 'Aarav Joshi', { view: 'sandbox', file: '/src/App.tsx' }),
        peer('kabir', 'Kabir Mehta', { view: 'sandbox' }),
      ],
      'me',
    );

    expect(host.status).toBe('Host · In the React project, src/App.tsx');
    expect(kabir.status).toBe('In the React project');
  });

  it('gives each person a colour by join order', () => {
    const result = roomMembers(members, [], 'me');
    expect(result.map((m) => m.colour.bgClass)).toEqual([
      'bg-presence-1',
      'bg-presence-2',
      'bg-presence-3',
      'bg-presence-4',
    ]);
  });

  it('lists someone who just joined, once, even with two tabs open', () => {
    const result = roomMembers(
      members,
      [peer('new', 'Ravi Rao'), peer('new', 'Ravi Rao', { clientId: 99 })],
      'me',
    );

    expect(result.map((m) => m.name)).toEqual([
      'Aarav Joshi',
      'Diya Shah',
      'Kabir Mehta',
      'Meera Iyer',
      'Ravi Rao',
    ]);
    expect(result[4]).toMatchObject({ online: true, status: 'In the room' });
  });
});
