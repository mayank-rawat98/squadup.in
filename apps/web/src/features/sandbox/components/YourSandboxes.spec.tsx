import { act, fireEvent, screen } from '@testing-library/react';
import { deleteSandbox, listSandboxes } from '../api/sandboxes.api';
import YourSandboxes from './YourSandboxes';
import { SANDBOX, renderWithQuery } from './sandbox.test-utils';

jest.mock('../api/sandboxes.api', () => ({
  listSandboxes: jest.fn(),
  deleteSandbox: jest.fn(),
}));

const listMock = jest.mocked(listSandboxes);
const deleteMock = jest.mocked(deleteSandbox);

const page = (data: (typeof SANDBOX)[]) => ({
  data,
  currentPage: 1,
  itemsPerPage: 50,
  totalItems: data.length,
  totalPages: 1,
});

describe('YourSandboxes', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue(page([SANDBOX]));
    deleteMock.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('links each sandbox to its workspace', async () => {
    renderWithQuery(<YourSandboxes />);

    const link = await screen.findByRole('link', { name: /Todo app/ });

    expect(link.getAttribute('href')).toBe(`/sandbox/${SANDBOX.id}`);
    expect(screen.getByText('1 of 50')).toBeTruthy();
  });

  it('says so when there are no sandboxes yet', async () => {
    listMock.mockResolvedValue(page([]));
    renderWithQuery(<YourSandboxes />);

    expect(await screen.findByText('No sandboxes yet')).toBeTruthy();
  });

  it('deletes only after the person confirms', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderWithQuery(<YourSandboxes />);
    const button = await screen.findByRole('button', {
      name: 'Delete Todo app',
    });

    await act(async () => fireEvent.click(button));
    expect(deleteMock).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await act(async () => fireEvent.click(button));
    expect(deleteMock).toHaveBeenCalledWith(SANDBOX.id);
  });
});
