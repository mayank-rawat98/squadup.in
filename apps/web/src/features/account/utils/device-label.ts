import type { UserDevice } from '../types/account.types';

const UNKNOWN = new Set(['', 'unknown']);
const known = (value: string | undefined) =>
  value && !UNKNOWN.has(value.trim().toLowerCase()) ? value.trim() : null;

/** "Chrome on Linux", or a generic name when the API couldn't tell. */
export function deviceName(device: UserDevice): string {
  const name = known(device.deviceName);
  const os = known(device.deviceOs);
  if (name && os) return `${name} on ${os}`;
  return name ?? os ?? 'Unknown device';
}

/** "Pune, India", or the masked IP when the location is unknown. */
export function deviceLocation(device: UserDevice): string {
  const place = [known(device.city), known(device.country)].filter(Boolean);
  return place.length ? place.join(', ') : `IP ${device.ipMask}`;
}
