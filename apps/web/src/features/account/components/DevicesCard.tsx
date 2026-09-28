'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Smartphone } from 'lucide-react';
import { Alert, Badge, Button, Spinner, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { getDevices, revokeDevice } from '../api/account.api';
import { ACCOUNT_QUERY_KEYS } from '../constants/account.constant';
import type { UserDevice } from '../types/account.types';
import { deviceLocation, deviceName } from '../utils/device-label';
import { formatLastActive } from '../utils/last-active';
import SettingsCard from './SettingsCard';

/*
 * Every device signed in to the account, newest activity first. This one is
 * marked and can't be signed out from here; "Sign out" is the way to do that.
 */
export default function DevicesCard() {
  const session = useSession();
  const queryClient = useQueryClient();
  const devices = useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.devices,
    queryFn: ({ signal }) => getDevices(signal),
  });

  const revoke = useMutation({
    mutationFn: (deviceId: string) => revokeDevice(deviceId),
    onSuccess: async () => {
      toast.success('That device is signed out.');
      await queryClient.invalidateQueries({
        queryKey: ACCOUNT_QUERY_KEYS.devices,
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const sorted = [...(devices.data ?? [])].sort(
    (a, b) => b.lastSeen - a.lastSeen,
  );

  return (
    <SettingsCard
      title="Signed-in devices"
      description="Sign out any device you don't recognise, then change your password."
      headingId="devices-heading"
    >
      {devices.isPending ? (
        <Spinner label="Loading your devices" showLabel />
      ) : devices.isError ? (
        <Alert tone="danger">
          <p>{getErrorMessage(devices.error)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void devices.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {sorted.map((device) => (
            <DeviceRow
              key={device.deviceId}
              device={device}
              current={device.deviceId === session?.deviceId}
              revoking={
                revoke.isPending && revoke.variables === device.deviceId
              }
              disabled={revoke.isPending}
              onRevoke={() => revoke.mutate(device.deviceId)}
            />
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}

function DeviceRow({
  device,
  current,
  revoking,
  disabled,
  onRevoke,
}: {
  device: UserDevice;
  current: boolean;
  revoking: boolean;
  disabled: boolean;
  onRevoke: () => void;
}) {
  const Icon = device.deviceType === 'Mobile' ? Smartphone : Monitor;
  const name = deviceName(device);

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Icon
        aria-hidden="true"
        className="text-muted-foreground h-5 w-5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm flex flex-wrap items-center gap-2 font-medium">
          <span className="wrap-anywhere">{name}</span>
          {current ? <Badge variant="subtle">This device</Badge> : null}
        </p>
        <p className="text-caption text-muted-foreground">
          {deviceLocation(device)} · {formatLastActive(device.lastSeen)}
        </p>
      </div>
      {current ? null : (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onRevoke}
          aria-label={`Sign out ${name}`}
          className="self-start sm:self-auto"
        >
          {revoking ? 'Signing out…' : 'Sign out'}
        </Button>
      )}
    </li>
  );
}
