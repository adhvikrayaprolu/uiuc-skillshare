export type AvailabilityStatus = 'open' | 'not-available' | 'invisible';

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  open: 'Open to swaps',
  'not-available': 'Not taking requests',
  invisible: 'Hidden',
};
