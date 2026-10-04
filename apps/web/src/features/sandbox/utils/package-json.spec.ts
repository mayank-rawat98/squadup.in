/**
 * @jest-environment node
 */
import {
  addDependency,
  parsePackageSpec,
  readDependencies,
  removeDependency,
} from './package-json';

const PACKAGE_JSON = JSON.stringify({
  name: 'todo',
  scripts: { dev: 'vite' },
  dependencies: { react: '^19.2.0', 'lucide-react': '^1.51.0' },
});

describe('parsePackageSpec', () => {
  it.each([
    ['zod', { name: 'zod', version: 'latest' }],
    ['zod@3', { name: 'zod', version: '3' }],
    [' Zod@^3.2.0 ', { name: 'zod', version: '^3.2.0' }],
    [
      '@tanstack/react-query@5',
      { name: '@tanstack/react-query', version: '5' },
    ],
    [
      '@tanstack/react-query',
      { name: '@tanstack/react-query', version: 'latest' },
    ],
  ])('reads %p', (input, expected) => {
    expect(parsePackageSpec(input)).toEqual(expected);
  });

  it('asks for a name when nothing was typed', () => {
    expect(parsePackageSpec('')).toEqual({
      error: 'Enter a package name, like zod or zod@3.',
    });
  });

  it.each(['not a name', '../evil', '@/x'])('refuses the name %p', (input) => {
    expect(parsePackageSpec(input)).toEqual({
      error: expect.stringContaining("isn't a valid npm package name"),
    });
  });

  it.each(['zod@', 'zod@https://evil.test/x.tgz', 'zod@file:../x'])(
    'refuses the version in %p',
    (input) => {
      expect(parsePackageSpec(input)).toEqual({
        error: 'Use a version like 3, ^3.2.0 or latest.',
      });
    },
  );
});

describe('readDependencies', () => {
  it('lists dependencies by name', () => {
    expect(readDependencies(PACKAGE_JSON)).toEqual([
      ['lucide-react', '^1.51.0'],
      ['react', '^19.2.0'],
    ]);
  });

  it('is empty for JSON it cannot read', () => {
    expect(readDependencies('{ nope')).toEqual([]);
    expect(readDependencies('[]')).toEqual([]);
  });
});

describe('addDependency', () => {
  it('adds the package in name order and keeps the other fields', () => {
    const result = JSON.parse(addDependency(PACKAGE_JSON, 'zod', '3') ?? '');

    expect(result.name).toBe('todo');
    expect(result.scripts).toEqual({ dev: 'vite' });
    expect(Object.entries(result.dependencies)).toEqual([
      ['lucide-react', '^1.51.0'],
      ['react', '^19.2.0'],
      ['zod', '3'],
    ]);
  });

  it('changes the version of a package that is already there', () => {
    const result = JSON.parse(
      addDependency(PACKAGE_JSON, 'react', '^19.3.0') ?? '',
    );
    expect(result.dependencies.react).toBe('^19.3.0');
  });

  it('gives null for JSON it cannot read', () => {
    expect(addDependency('{ nope', 'zod', '3')).toBeNull();
  });
});

describe('removeDependency', () => {
  it('removes the package', () => {
    const result = JSON.parse(
      removeDependency(PACKAGE_JSON, 'lucide-react') ?? '',
    );
    expect(result.dependencies).toEqual({ react: '^19.2.0' });
  });
});
