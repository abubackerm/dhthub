export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
}

export function detectDevice(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return DeviceType.DESKTOP;

  const ua = userAgent.toLowerCase();

  // Detect tablets first (they often also match mobile patterns)
  if (
    /ipad/.test(ua) ||
    /tablet/.test(ua) ||
    /playbook/.test(ua) ||
    /silk/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua))
  ) {
    return DeviceType.TABLET;
  }

  // Detect mobile
  if (
    /mobile/.test(ua) ||
    /iphone/.test(ua) ||
    /ipod/.test(ua) ||
    /android/.test(ua) ||
    /blackberry/.test(ua) ||
    /opera mini/.test(ua) ||
    /iemobile/.test(ua) ||
    /windows phone/.test(ua)
  ) {
    return DeviceType.MOBILE;
  }

  return DeviceType.DESKTOP;
}
