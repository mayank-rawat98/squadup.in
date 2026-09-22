import {
  ArrayMinSize,
  IsArray,
  IsIP,
  IsOptional,
  IsString,
} from 'class-validator';

export class WhitelistIpDto {
  @IsIP()
  ip!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkWhitelistDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIP(undefined, { each: true })
  ips!: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}
