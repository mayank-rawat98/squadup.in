import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';
import { UsernameQueryDto } from './username.dto';

async function check(username: unknown) {
  const dto = plainToInstance(UsernameQueryDto, { username });
  const errors = await validate(dto);
  return { value: dto.username, valid: errors.length === 0 };
}

describe('username validation', () => {
  it('trims and lowercases', async () => {
    await expect(check('  Asha_V ')).resolves.toEqual({
      value: 'asha_v',
      valid: true,
    });
  });

  it.each(['abc', 'a-b_c9', 'a'.repeat(30)])('accepts %s', async (name) => {
    expect((await check(name)).valid).toBe(true);
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(31)],
    ['starting with a digit', '9lives'],
    ['starting with _', '_asha'],
    ['with a space', 'asha v'],
    ['with a dot', 'asha.v'],
    ['non-ASCII', 'āsha'],
  ])('rejects a name %s', async (_why, name) => {
    expect((await check(name)).valid).toBe(false);
  });

  it('applies the same rules on PATCH /users', async () => {
    const dto = plainToInstance(UpdateUserDto, { username: ' Bad Name ' });
    expect(await validate(dto)).toHaveLength(1);
    const ok = plainToInstance(UpdateUserDto, { username: 'Good_Name' });
    expect(await validate(ok)).toHaveLength(0);
    expect(ok.username).toBe('good_name');
  });
});
