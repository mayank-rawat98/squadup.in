import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto';

async function errorsFor(newPassword: string) {
  const dto = plainToInstance(ForgotPasswordDto, {
    encodedEmail: 'user%40example.com',
    token: 'token',
    newPassword,
  });
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.keys(error.constraints ?? {}));
}

describe('ForgotPasswordDto', () => {
  it('rejects a new password shorter than 8 characters', async () => {
    expect(await errorsFor('short12')).toContain('minLength');
  });

  it('rejects a new password longer than 128 characters', async () => {
    expect(await errorsFor('a'.repeat(129))).toContain('maxLength');
  });

  it('accepts a new password of 8 to 128 characters', async () => {
    expect(await errorsFor('a'.repeat(8))).toEqual([]);
    expect(await errorsFor('a'.repeat(128))).toEqual([]);
  });
});
