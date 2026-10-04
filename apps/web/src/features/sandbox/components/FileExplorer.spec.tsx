import { act, fireEvent, render, screen, within } from '@testing-library/react';
import FileExplorer from './FileExplorer';

const FILES = {
  '/index.html': '<div id="root"></div>',
  '/package.json': '{}',
  '/src/App.tsx': 'app',
  '/src/main.tsx': 'main',
  '/src/components/Card.tsx': 'card',
};

const project = {
  files: FILES,
  activeFile: '/src/App.tsx',
  visibleFiles: ['/src/App.tsx'],
  addFiles: jest.fn(),
  deleteFile: jest.fn(),
  openFile: jest.fn(),
  updateFile: jest.fn(),
};

function setup() {
  return render(<FileExplorer project={project} open onToggle={jest.fn()} />);
}

const row = (name: string) =>
  screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });

function typeName(label: RegExp, value: string) {
  const input = screen.getByRole('textbox', { name: label });
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('FileExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows folders first and opens a folder on click', () => {
    setup();

    const names = screen
      .getAllByRole('treeitem')
      .map((item) => item.getAttribute('data-path'));
    expect(names).toEqual([
      '/src',
      '/src/components',
      '/src/App.tsx',
      '/src/main.tsx',
      '/index.html',
      '/package.json',
    ]);

    fireEvent.click(row('components'));
    expect(row('components').getAttribute('aria-expanded')).toBe('true');
    expect(row('Card.tsx')).toBeTruthy();
  });

  it('adds a file in the folder that was clicked', () => {
    setup();

    fireEvent.click(row('components'));
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
    typeName(/new file in src\/components/, 'Button.tsx');

    expect(project.addFiles).toHaveBeenCalledWith({
      '/src/components/Button.tsx':
        'export default function Button() {\n  return <div>Button</div>;\n}\n',
    });
    expect(project.openFile).toHaveBeenCalledWith('/src/components/Button.tsx');
  });

  it('makes a folder, then a file in it from its right-click menu', () => {
    setup();

    fireEvent.click(row('src'));
    fireEvent.click(row('src'));
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    typeName(/new folder in src/, 'hooks');
    expect(row('hooks')).toBeTruthy();

    fireEvent.contextMenu(row('hooks'));
    const menu = screen.getByRole('menu', { name: 'Actions for hooks' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'New file…' }));
    typeName(/new file in src\/hooks/, 'use-todos.ts');

    expect(project.addFiles).toHaveBeenCalledWith({
      '/src/hooks/use-todos.ts': '',
    });
  });

  it('shows what is wrong with a name and keeps the box open', () => {
    setup();

    fireEvent.contextMenu(row('src'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'New file…' }));
    typeName(/new file in src/, 'App.tsx');

    expect(screen.getByRole('alert').textContent).toBe(
      'App.tsx already exists here.',
    );
    expect(project.addFiles).not.toHaveBeenCalled();
  });

  it('renames a folder by moving every file in it', () => {
    setup();

    fireEvent.contextMenu(row('components'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename…' }));
    typeName(/New name for components/, 'ui');

    expect(project.addFiles).toHaveBeenCalledWith({
      '/src/ui/Card.tsx': 'card',
    });
    expect(project.deleteFile).toHaveBeenCalledWith('/src/components/Card.tsx');
  });

  it('deletes a file after confirming, opening another if it was the only tab', () => {
    setup();

    fireEvent.contextMenu(row('App.tsx'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(project.openFile).toHaveBeenCalledWith('/index.html');
    expect(project.deleteFile).toHaveBeenCalledWith('/src/App.tsx');
  });

  it("won't rename or delete a file the project needs, or a folder holding one", () => {
    setup();

    fireEvent.contextMenu(row('main.tsx'));
    const fileMenu = screen.getByRole('menu');
    expect(
      within(fileMenu)
        .getByRole('menuitem', { name: /Delete/ })
        .getAttribute('aria-disabled'),
    ).toBe('true');
    fireEvent.keyDown(fileMenu, { key: 'Escape' });

    fireEvent.contextMenu(row('src'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete/ }));
    expect(project.deleteFile).not.toHaveBeenCalled();
  });

  it('moves with the arrow keys and renames with F2', () => {
    setup();
    const tree = screen.getByRole('tree');

    act(() => row('src').focus());
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'F2' });

    expect(
      screen.getByRole('textbox', { name: 'New name for App.tsx' }),
    ).toBeTruthy();
  });
});
