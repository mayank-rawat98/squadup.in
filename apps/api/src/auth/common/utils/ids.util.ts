import { randomBytes } from 'crypto';

export const generateJwtId = () => randomBytes(16).toString('base64url'); // ~22 chars
export const generateDeviceId = () => randomBytes(16).toString('hex');
