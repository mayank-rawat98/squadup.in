import { SAMPLE_OTP, sampleVariables } from './sample-variables';

describe('sampleVariables', () => {
  it('fills every variable, with a fake code for otp and the app for links', () => {
    expect(
      sampleVariables(
        ['otp', 'url', 'revertUrl', 'fullName'],
        'https://squadup.test',
      ),
    ).toEqual({
      otp: SAMPLE_OTP,
      url: 'https://squadup.test',
      revertUrl: 'https://squadup.test',
      fullName: '[fullName]',
    });
  });

  it('returns nothing for an email with no variables of its own', () => {
    expect(sampleVariables([], 'https://squadup.test')).toEqual({});
  });
});
