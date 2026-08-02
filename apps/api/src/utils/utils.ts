import { BadRequestException } from '@nestjs/common';
import crypto, { randomBytes } from 'crypto';

export const normalizeUrl = (hostname: string | undefined): string => {
  if (!hostname) {
    throw new BadRequestException('Hostname is required');
  }
  let normalizedHostname = hostname;
  if (!/^https?:\/\//i.test(hostname)) {
    normalizedHostname = `https://${hostname}`;
  }
  return normalizedHostname;
};

export function generateTicketId(prefix: string) {
  const timePart = Date.now().toString(36).slice(-5);
  const randomPart = randomBytes(5).toString('hex');
  return `${prefix}-${timePart}-${randomPart}`.toUpperCase();
}
export const generateUniqueFilename = (fileType: string): string => {
  const uniqueName = crypto.randomBytes(16).toString('hex');
  return `${uniqueName}.${fileType}`;
};
