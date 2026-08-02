export interface JwtAccessClaims {
  sub: string;
  did: string;
  jti: string;
  typ: 'access';
  iat: number;
  exp: number;
}

export interface JwtRefreshClaims {
  sub: string;
  did: string;
  jti: string;
  typ: 'refresh';
  iat: number;
  exp: number;
  ver?: number;
}

export interface DeviceMeta {
  userId: string;
  uaHash: string;
  ipHash: string;
  ipMask: string;
  city: string;
  country: string;
  region: string;
  countryCode: string;
  countryFlag: string;
  createdAt: number; // ms
  lastSeen: number; // ms
  deviceName: string;
  deviceType: string;
  deviceOs: string;
}

export interface DeviceDTO {
  deviceId: string;
  lastSeen: number;
  ipMask: string;
  city: string;
  country: string;
  region: string;
  countryCode: string;
  countryFlag: string;
  createdAt?: number;
  deviceName?: string;
  deviceType?: string;
  deviceOs?: string;
  // expose only hashed metadata to keep privacy
  uaHash?: string;
  ipHash?: string;
}
export interface AuthData {
  userId: string;
  deviceId: string;
  accessToken?: string; // Auth token
  tokenJti?: string;
}
export interface Credentials {
  userId: string;
  password: string;
  remember?: boolean;
}

export interface RefreshRecord {
  userId: string;
  deviceId: string;
  /**
   * Whether the session opted into "remember me". Drives cookie persistence on
   * rotation: remember-me sessions get a dated cookie, the rest a session
   * cookie the browser drops on close.
   */
  rememberMe: boolean;
}

export interface TwoFactorSession {
  userId: string;
  ua: string;
  ip: string;
  rememberMe: boolean;
  attempts: number;
  /** Which 2FA method the user selected for this session */
  selectedMethod?: string;
}
