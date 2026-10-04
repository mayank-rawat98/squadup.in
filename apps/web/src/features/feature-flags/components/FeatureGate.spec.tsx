import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getAvailableFeatures,
  listExperimentalFeatures,
  requestFeatureAccess,
} from '../api/feature-flags.api';
import type { ExperimentalFeature } from '../types/feature-flags.types';
import FeatureGate from './FeatureGate';

jest.mock('@/lib/auth', () => ({ useSession: () => ({ accessToken: 't' }) }));
jest.mock('../api/feature-flags.api');
const getAvailable = jest.mocked(getAvailableFeatures);
const listExperimental = jest.mocked(listExperimentalFeatures);
const requestAccess = jest.mocked(requestFeatureAccess);

const SANDBOX: ExperimentalFeature = {
  key: 'reactSandbox',
  name: 'React sandbox',
  description: 'React projects with a live preview.',
  userStatus: 'NONE',
};

function renderGate(children: ReactNode = <p>The sandbox</p>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FeatureGate feature="reactSandbox">{children}</FeatureGate>
    </QueryClientProvider>,
  );
}

describe('FeatureGate', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    listExperimental.mockResolvedValue([SANDBOX]);
  });

  it('shows the page to someone the flag reaches', async () => {
    getAvailable.mockResolvedValue({ features: ['reactSandbox'] });

    renderGate();

    expect(await screen.findByText('The sandbox')).toBeTruthy();
  });

  it('offers to request access instead of the page', async () => {
    getAvailable.mockResolvedValue({ features: [] });
    requestAccess.mockResolvedValue({});

    renderGate();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Request access' }),
    );

    await waitFor(() =>
      expect(requestAccess).toHaveBeenCalledWith('reactSandbox'),
    );
    expect(screen.queryByText('The sandbox')).toBeNull();
    expect(
      screen.getByText('React projects with a live preview.'),
    ).toBeTruthy();
  });

  it('says a request is waiting rather than offering another', async () => {
    getAvailable.mockResolvedValue({ features: [] });
    listExperimental.mockResolvedValue([{ ...SANDBOX, userStatus: 'PENDING' }]);

    renderGate();

    expect(
      await screen.findByRole('heading', {
        name: "You've asked for React sandbox",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request access' })).toBeNull();
  });

  it('gives the reason a request was turned down, and lets you ask again', async () => {
    getAvailable.mockResolvedValue({ features: [] });
    listExperimental.mockResolvedValue([
      { ...SANDBOX, userStatus: 'REJECTED', rejectionReason: 'Full for now' },
    ]);

    renderGate();

    expect(
      await screen.findByText(/wasn't approved: Full for now/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeTruthy();
  });

  it('says a feature that cannot be asked for is not open yet', async () => {
    getAvailable.mockResolvedValue({ features: [] });
    listExperimental.mockResolvedValue([]);

    renderGate();

    expect(
      await screen.findByRole('heading', { name: "This isn't open yet" }),
    ).toBeTruthy();
  });

  it('offers a retry when access could not be checked', async () => {
    getAvailable.mockRejectedValue(new Error('offline'));

    renderGate();

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeTruthy();
  });
});
