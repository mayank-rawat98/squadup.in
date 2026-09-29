import { notificationsSocketUrl } from './socket-url';

describe('notificationsSocketUrl', () => {
  it('drops the API path and adds the namespace', () => {
    expect(notificationsSocketUrl('https://api.squadup.in/api/v1')).toBe(
      'https://api.squadup.in/notifications',
    );
    expect(notificationsSocketUrl('http://localhost:8080/api/v1/')).toBe(
      'http://localhost:8080/notifications',
    );
  });
});
