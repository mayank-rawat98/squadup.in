import type { Sandbox } from './entities/sandbox.entity';

/* Response shapes for the sandbox. The owner's id stays inside the API. */

export function toSandboxSummary(
  sandbox: Pick<Sandbox, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
) {
  return {
    id: sandbox.id,
    name: sandbox.name,
    createdAt: sandbox.createdAt,
    updatedAt: sandbox.updatedAt,
  };
}

export function toSandboxDetail(sandbox: Sandbox) {
  return { ...toSandboxSummary(sandbox), files: sandbox.files };
}
