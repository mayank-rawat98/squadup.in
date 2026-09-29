import { screen, within } from '@testing-library/react';
import { ApiError } from '@/lib/api/api-error';
import { listEmailTemplates } from '../api/email-templates.api';
import EmailTemplatesScreen from './EmailTemplatesScreen';
import { renderWithQuery, template } from './email-templates.test-utils';

jest.mock('../api/email-templates.api', () => ({
  listEmailTemplates: jest.fn(),
}));

const listMock = jest.mocked(listEmailTemplates);

describe('EmailTemplatesScreen', () => {
  beforeEach(() => listMock.mockReset());

  it('groups emails by who receives them, with each status in words', async () => {
    listMock.mockResolvedValue([
      template(),
      template({
        emailType: 'password_reset',
        label: 'Reset password',
        templateId: null,
        status: 'not_configured',
      }),
      template({
        emailType: 'contact_us',
        audience: 'admin',
        label: 'New contact-us submission (to ops)',
        status: 'off',
        isActive: false,
      }),
    ]);

    renderWithQuery(<EmailTemplatesScreen />);

    const users = await screen.findByRole('region', { name: 'Sent to users' });
    const ops = screen.getByRole('region', { name: 'Sent to the ops inbox' });
    const welcome = within(users).getByRole('link', {
      name: /Welcome \/ verify email/,
    });
    expect(welcome.getAttribute('href')).toBe('/email-templates/user/welcome');
    expect(welcome.textContent).toContain('Configured');
    expect(
      within(users).getByRole('link', { name: /Reset password/ }).textContent,
    ).toContain('Not configured');
    expect(within(ops).getByRole('link').textContent).toContain('Off');
  });

  it('says how many emails are not being sent', async () => {
    listMock.mockResolvedValue([
      template(),
      template({ emailType: 'a', templateId: null, status: 'not_configured' }),
      template({ emailType: 'b', status: 'off', isActive: false }),
    ]);

    renderWithQuery(<EmailTemplatesScreen />);

    expect(
      await screen.findByText(
        '1 of 3 emails have a template and are switched on.',
      ),
    ).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain(
      '2 emails are not being sent',
    );
  });

  it("shows the API's message with a retry when the list can't load", async () => {
    listMock.mockRejectedValue(new ApiError('Unauthorized Access', 403));

    renderWithQuery(<EmailTemplatesScreen />);

    expect(await screen.findByText('Unauthorized Access')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).not.toBeNull();
  });
});
