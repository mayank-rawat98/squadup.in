import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description:
      'OAuth 2.0 authorization code returned by Google Identity Services (popup code-client flow)',
    example: '4/0AY0e-g5...snip',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({
    description: 'Remember me option for persistent login',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({
    description:
      'Reserved for future role selection; not used in current auth flow',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isInstructor?: boolean;
}
