/**
 * @jest-environment node
 */
import { backupCodesFileContents, formatSecret } from './backup-codes';

describe('backupCodesFileContents', () => {
  it('lists every code under a header naming the account and date', () => {
    const text = backupCodesFileContents(
      ['AAAA1111BBBB', 'CCCC2222DDDD'],
      'student@example.com',
      new Date('2026-09-28T10:00:00Z'),
    );

    expect(text.split('\n')).toEqual([
      'SquadUp backup codes',
      'Account: student@example.com',
      'Generated: 2026-09-28',
      '',
      'Each code works once. Keep them somewhere safe and private.',
      'Generating new codes makes these stop working.',
      '',
      'AAAA1111BBBB',
      'CCCC2222DDDD',
      '',
    ]);
  });
});

describe('formatSecret', () => {
  it('groups the secret in fours', () => {
    expect(formatSecret('JBSWY3DPEHPK3PXPJBSW')).toBe(
      'JBSW Y3DP EHPK 3PXP JBSW',
    );
    expect(formatSecret('ABCDEF')).toBe('ABCD EF');
  });
});
