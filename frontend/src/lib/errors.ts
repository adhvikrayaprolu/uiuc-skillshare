export function apiErrorMessage(error: unknown): string {
  const data = (error as {response?: {data?: unknown}})?.response?.data;
  const describe = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(describe).filter(Boolean).join('; ');
    if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${describe(item)}`).join('; ');
    return '';
  };
  return describe(data) || (error instanceof Error ? error.message : 'The request failed. Please try again.');
}
