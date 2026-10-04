import { z } from 'zod';
import { SANDBOX_NAME_MAX_LENGTH } from '../constants/sandbox.constant';

export const sandboxNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the sandbox a name so you can find it later.')
  .max(
    SANDBOX_NAME_MAX_LENGTH,
    `Sandbox names can be up to ${SANDBOX_NAME_MAX_LENGTH} characters.`,
  );

export const createSandboxSchema = z.object({ name: sandboxNameSchema });

export type CreateSandboxValues = z.infer<typeof createSandboxSchema>;
