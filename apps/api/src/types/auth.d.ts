export interface Credentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface JwtPayload {
  id: string;
  email: string;
}

export interface Auth {
  accessToken: string;
  user?: IUser;
  refreshToken?: string;
  expiresIn?: number;
}
