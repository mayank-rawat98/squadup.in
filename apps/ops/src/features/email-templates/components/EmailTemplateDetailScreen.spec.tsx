import { act, fireEvent, screen } from '@testing-library/react';
import { ApiError } from '@/lib/api/api-error';
import {
  getEmailTemplate,
  sendTestEmail,
  updateEmailTemplate,
} from '../api/email-templates.api';
import EmailTemplateDetailScreen from './EmailTemplateDetailScreen';
import { renderWithQuery, template } from './email-templates.test-utils';

jest.mock('../api/email-templates.api', () => ({
  getEmailTemplate: jest.fn(),
  updateEmailTemplate: jest.fn(),
  sendTestEmail: jest.fn(),
}));
jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const getMock = jest.mocked(getEmailTemplate);
const updateMock = jest.mocked(updateEmailTemplate);
const testMock = jest.mocked(sendTestEmail);

function renderScreen() {
  return renderWithQuery(
    <EmailTemplateDetailScreen audience="user" emailType="welcome" />,
  );
}

describe('EmailTemplateDetailScreen', () => {
  beforeEach(() => {
    getMock.mockReset();
    updateMock.mockReset();
    testMock.mockReset();
  });

  it('shows the email, its template and the variables it receives', async () => {
    getMock.mockResolvedValue(template());

    renderScreen();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Welcome / verify email on registration',
      }),
    ).not.toBeNull();
    expect(
      (screen.getByLabelText(/^Template ID/) as HTMLInputElement).value,
    ).toBe('tpl_welcome');
    expect(screen.getByText('url')).not.toBeNull();
  });

  it('saves an emptied field as null, which clears it', async () => {
    getMock.mockResolvedValue(template({ fromEmail: 'hello@squadup.in' }));
    updateMock.mockResolvedValue(template({ templateId: null }));
    renderScreen();

    fireEvent.change(await screen.findByLabelText(/^Template ID/), {
      target: { value: '' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    expect(updateMock).toHaveBeenCalledWith('user', 'welcome', {
      templateId: null,
      fromEmail: 'hello@squadup.in',
      isActive: true,
    });
  });

  it('can switch the email off', async () => {
    getMock.mockResolvedValue(template());
    updateMock.mockResolvedValue(template({ isActive: false, status: 'off' }));
    renderScreen();

    fireEvent.click(await screen.findByLabelText('Send this email'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    expect(updateMock).toHaveBeenCalledWith('user', 'welcome', {
      templateId: 'tpl_welcome',
      fromEmail: null,
      isActive: false,
    });
  });

  it('keeps "Save changes" off until something changes', async () => {
    getMock.mockResolvedValue(template());
    renderScreen();

    const save = await screen.findByRole('button', { name: 'Save changes' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the API's refusal next to the form", async () => {
    getMock.mockResolvedValue(template());
    updateMock.mockRejectedValue(
      new ApiError('templateId may hold letters, digits…', 400),
    );
    renderScreen();

    fireEvent.change(await screen.findByLabelText(/^Template ID/), {
      target: { value: 'tpl_other' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    expect(screen.getByRole('alert').textContent).toContain(
      'templateId may hold letters, digits…',
    );
  });

  it('sends a test to the staff member', async () => {
    getMock.mockResolvedValue(template());
    testMock.mockResolvedValue({ to: 'ops@squadup.in', templateId: 'tpl_1' });
    renderScreen();

    await act(async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Send a test to me' }),
      );
    });

    expect(testMock).toHaveBeenCalledWith('user', 'welcome');
  });

  it('offers no test send until a template ID is saved', async () => {
    getMock.mockResolvedValue(
      template({ templateId: null, status: 'not_configured' }),
    );
    renderScreen();

    const button = await screen.findByRole('button', {
      name: 'Send a test to me',
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Save a template ID first.')).not.toBeNull();
  });

  it('says plainly when the app sends no such email', async () => {
    getMock.mockRejectedValue(
      new ApiError('SquadUp sends no "nope" email to the user audience.', 404),
    );
    renderScreen();

    expect(
      await screen.findByText("SquadUp doesn't send this email"),
    ).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
