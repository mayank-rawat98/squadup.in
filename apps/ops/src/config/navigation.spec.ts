import { isActivePath } from './navigation';

describe('isActivePath', () => {
  it('marks a section active on its own page and the pages under it', () => {
    expect(isActivePath('/email-templates', '/email-templates')).toBe(true);
    expect(
      isActivePath('/email-templates/user/welcome', '/email-templates'),
    ).toBe(true);
  });

  it('does not match a section that only shares a prefix', () => {
    expect(isActivePath('/email-templates-old', '/email-templates')).toBe(
      false,
    );
  });

  it('marks home active only on home itself', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/email-templates', '/')).toBe(false);
  });
});
