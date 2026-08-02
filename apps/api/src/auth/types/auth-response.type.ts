import { ApiProperty } from '@nestjs/swagger';

export class AuthResponse {
  @ApiProperty({
    description: 'The JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'The expiration time of the access token in seconds',
    example: 3600,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'The device ID for the session',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  deviceId!: string;
}
