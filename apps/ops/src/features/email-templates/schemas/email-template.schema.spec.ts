import { emailTemplateSchema } from './email-template.schema';

const valid = { templateId: 'tpl_aB3xK9mZ', fromEmail: '', isActive: true };

describe('emailTemplateSchema', () => {
  it('accepts a mailtr templateId and no sender', () => {
    expect(emailTemplateSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts empty values, which clear the fields', () => {
    expect(
      emailTemplateSchema.safeParse({ ...valid, templateId: '' }).success,
    ).toBe(true);
  });

  it('trims a pasted templateId', () => {
    const result = emailTemplateSchema.parse({
      ...valid,
      templateId: '  tpl_1  ',
    });
    expect(result.templateId).toBe('tpl_1');
  });

  it.each(['tpl 1', 'https://mailtr.co/t/tpl_1', 'x'.repeat(129)])(
    'refuses the templateId %p',
    (templateId) => {
      expect(
        emailTemplateSchema.safeParse({ ...valid, templateId }).success,
      ).toBe(false);
    },
  );

  it('refuses a sender that is not an email address', () => {
    expect(
      emailTemplateSchema.safeParse({ ...valid, fromEmail: 'hello' }).success,
    ).toBe(false);
  });
});
