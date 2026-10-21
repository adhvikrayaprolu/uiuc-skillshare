import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import type { AttentionItem } from '../types/api';

const peer = (name: string) => ({ name, profile_id: 3 });
const items: AttentionItem[] = [
  { action: 'respond', request_id: 1, kind: 'swap', topic: 'Speech for pandas', skill: 'Data Analysis', peer: peer('Jordan Lee'), updated_at: '' },
  { action: 'respond', request_id: 2, kind: 'help', topic: 'Debugging', skill: 'Python', peer: peer('Aisha Rahman'), updated_at: '' },
];
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { firstName: 'Alex' } }) }));
vi.mock('../hooks/useDashboard', () => ({ useDashboard: () => ({ isLoading: false, isError: false, data: { attention_items: items, checklist: [] } }) }));
vi.mock('../hooks/useRecommendedProfiles', () => ({ useRecommendedProfiles: () => ({ isLoading: false, isError: false, data: { profiles: [] } }) }));
vi.mock('../hooks/useProfileEditor', () => ({ useCurrentProfile: () => ({ data: { learning_goals: [1] } }) }));
vi.mock('../components/growth/InviteCard', () => ({ InviteCard: () => null }));
vi.mock('../components/growth/ColdStartPanel', () => ({ ColdStartPanel: () => null }));
afterEach(cleanup);

it('describes incoming swaps and help requests differently', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByText('Jordan Lee').parentElement?.textContent).toBe('Jordan Lee proposed a swap for your Data Analysis');
  expect(screen.getByText('Aisha Rahman').parentElement?.textContent).toBe('Aisha Rahman asked for help with Python');
});
