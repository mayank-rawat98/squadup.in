import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Staff } from './entities/staff.entity';
import { StaffAuthService, StaffSession } from './services/staff-auth.service';
import { StaffAuthController } from './staff-auth.controller';

jest.mock('../config', () => ({ isProduction: true }));

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/v1/staff/auth',
};

function session(): StaffSession {
  const staff = Object.assign(new Staff(), {
    id: 'staff-1',
    email: 'ops@squadup.in',
    password: 'hash',
  });
  return {
    accessToken: 'access-1',
    expiresIn: 900,
    refreshToken: 'refresh-1',
    refreshExpiresIn: 604800,
    deviceId: 'device-1',
    staff,
  };
}

function fakeResponse() {
  return { cookie: jest.fn() } as unknown as Response & {
    cookie: jest.Mock;
  };
}

describe('StaffAuthController', () => {
  let service: jest.Mocked<
    Pick<StaffAuthService, 'login' | 'refresh' | 'logout' | 'logoutAll'>
  >;
  let controller: StaffAuthController;

  beforeEach(() => {
    service = {
      login: jest.fn().mockResolvedValue(session()),
      refresh: jest.fn().mockResolvedValue(session()),
      logout: jest.fn().mockResolvedValue(undefined),
      logoutAll: jest.fn().mockResolvedValue(undefined),
    };
    controller = new StaffAuthController(
      service as unknown as StaffAuthService,
    );
  });

  describe('login', () => {
    it('sets the refresh token as an HttpOnly cookie and leaves it out of the body', async () => {
      const res = fakeResponse();

      const body = await controller.login(
        { email: 'ops@squadup.in', password: 'correct-horse' },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith('staff_refresh', 'refresh-1', {
        ...COOKIE_OPTIONS,
        maxAge: 604800 * 1000,
      });
      expect(body.data).toEqual({
        accessToken: 'access-1',
        deviceId: 'device-1',
        expiresIn: 900,
        staff: expect.objectContaining({ id: 'staff-1' }),
      });
      expect(JSON.stringify(body)).not.toContain('refresh-1');
      expect(body.data.staff).not.toHaveProperty('password');
    });
  });

  describe('refresh', () => {
    it('rotates the token from the cookie into a new cookie', async () => {
      const res = fakeResponse();
      const req = { cookies: { staff_refresh: 'refresh-0' } } as Request;

      const body = await controller.refresh(req, res);

      expect(service.refresh).toHaveBeenCalledWith('refresh-0');
      expect(res.cookie).toHaveBeenCalledWith(
        'staff_refresh',
        'refresh-1',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(body.data).toEqual({
        accessToken: 'access-1',
        deviceId: 'device-1',
        expiresIn: 900,
      });
    });

    it('refuses without calling the service when there is no cookie', async () => {
      const res = fakeResponse();

      await expect(
        controller.refresh({ cookies: {} } as Request, res),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(service.refresh).not.toHaveBeenCalled();
    });

    it('leaves the cookie alone when the token is refused', async () => {
      const res = fakeResponse();
      service.refresh.mockRejectedValue(
        new UnauthorizedException('Session expired'),
      );

      await expect(
        controller.refresh(
          { cookies: { staff_refresh: 'spent' } } as unknown as Request,
          res,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  it('ends this device and clears the cookie on logout', async () => {
    const res = fakeResponse();

    await controller.logout({ staffId: 'staff-1', deviceId: 'device-1' }, res);

    expect(service.logout).toHaveBeenCalledWith('staff-1', 'device-1');
    expect(res.cookie).toHaveBeenCalledWith(
      'staff_refresh',
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
  });

  it('ends every device and clears the cookie on logout-all', async () => {
    const res = fakeResponse();

    await controller.logoutAll({ staffId: 'staff-1' }, res);

    expect(service.logoutAll).toHaveBeenCalledWith('staff-1');
    expect(res.cookie).toHaveBeenCalledWith(
      'staff_refresh',
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
  });
});
