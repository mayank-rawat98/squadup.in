import DeviceDetector from 'node-device-detector';

interface DeviceDetails {
  deviceName: string;
  deviceType: string;
  deviceOs: string;
}

const detector = new DeviceDetector({
  clientIndexes: true,
  deviceIndexes: true,
  deviceAliasCode: false,
  deviceTrusted: false,
  deviceInfo: false,
  maxUserAgentSize: 500,
});

export const getDeviceDetails = (userAgent: string): DeviceDetails => {
  const result = detector.detect(userAgent);

  const client = result.client;
  const device = result.device;
  const os = result.os;

  let deviceName = 'Unknown';
  let deviceType = 'Unknown';
  let deviceOs = 'Unknown';

  if (device.type === 'smartphone') {
    deviceName =
      device.brand || device.model
        ? `${device.brand ?? ''} ${device.model ?? ''}`.trim()
        : 'Unknown Smartphone';
    deviceType = 'Smartphone';
    deviceOs = `${os.name} ${os.version}`;
  } else if (device.type === 'tablet') {
    deviceName =
      device.brand || device.model
        ? `${device.brand ?? ''} ${device.model ?? ''}`.trim()
        : 'Unknown Tablet';
    deviceType = 'Tablet';
    deviceOs = `${os.name} ${os.version}`;
  } else if (device.type === 'desktop') {
    deviceName = `${client.name} ${client.type} v${client.version}`;
    deviceType = 'Desktop';
    deviceOs = `${os.name} ${os.version}`;
  }

  return {
    deviceName,
    deviceType,
    deviceOs,
  };
};
