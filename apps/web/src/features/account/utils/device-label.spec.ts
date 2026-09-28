import type { UserDevice } from '../types/account.types';
import { deviceLocation, deviceName } from './device-label';

const DEVICE: UserDevice = {
  deviceId: 'd1',
  lastSeen: 0,
  createdAt: 0,
  ipMask: '127.0.*.*',
  city: 'Pune',
  country: 'India',
  deviceName: 'Chrome browser v141',
  deviceType: 'Desktop',
  deviceOs: 'GNU/Linux ',
};

describe('deviceName', () => {
  it('names the browser and the OS', () => {
    expect(deviceName(DEVICE)).toBe('Chrome browser v141 on GNU/Linux');
  });

  it('falls back when the API could not tell', () => {
    expect(
      deviceName({ ...DEVICE, deviceName: 'Unknown', deviceOs: 'Unknown' }),
    ).toBe('Unknown device');
  });
});

describe('deviceLocation', () => {
  it('shows the city and country', () => {
    expect(deviceLocation(DEVICE)).toBe('Pune, India');
  });

  it('shows the masked IP when the location is unknown', () => {
    expect(
      deviceLocation({ ...DEVICE, city: 'unknown', country: 'unknown' }),
    ).toBe('IP 127.0.*.*');
  });
});
