import { IsIP } from 'class-validator';

export class IpParam {
  @IsIP()
  ip!: string;
}
