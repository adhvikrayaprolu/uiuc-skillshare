import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RequestModal} from './RequestModal';

afterEach(cleanup);

function view(overrides: Partial<Parameters<typeof RequestModal>[0]> = {}) {
  const onSubmitRequest = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<RequestModal isOpen onClose={onClose} recipientName="Riley" recipientSkills={['Figma', 'Python']} offerSkills={['Python', 'GitHub']} onSubmitRequest={onSubmitRequest} {...overrides} />);
  return {onSubmitRequest, onClose};
}

it('sends a swap with the suggested skills and a generated topic', async () => {
  const {onSubmitRequest, onClose} = view({initialKind: 'swap', suggestedLearn: 'Figma', suggestedOffer: 'GitHub'});
  expect(screen.getByRole('heading', {name: 'Propose a skill swap'})).toBeTruthy();
  await userEvent.type(screen.getByLabelText(/^Message/), 'Trade a Figma session for GitHub help?');
  await userEvent.click(screen.getByRole('button', {name: 'Send swap proposal'}));
  expect(onSubmitRequest).toHaveBeenCalledWith(expect.objectContaining({kind: 'swap', relatedSkill: 'Figma', offeredSkill: 'GitHub', topic: 'Figma for GitHub'}));
  expect(onClose).toHaveBeenCalled();
});

it('never offers the skill you are asking to learn', async () => {
  view({initialKind: 'swap', suggestedLearn: 'Python'});
  const offers = Array.from((screen.getByLabelText(/^You'll teach in return/) as HTMLSelectElement).options).map((option) => option.value);
  expect(offers).not.toContain('Python');
});

it('keeps swaps unavailable until you list a skill to teach', () => {
  view({offerSkills: []});
  expect((screen.getByRole('button', {name: 'Propose a swap'}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('Add a skill you can teach to your profile to propose swaps.')).toBeTruthy();
});

it('keeps the dialog open with an error when sending fails', async () => {
  const {onClose} = view({onSubmitRequest: vi.fn().mockRejectedValue(new Error('nope'))});
  await userEvent.type(screen.getByLabelText(/^Topic/), 'Resume review');
  await userEvent.type(screen.getByLabelText(/^Message/), 'Could you look at my resume?');
  await userEvent.click(screen.getByRole('button', {name: 'Send request'}));
  expect((await screen.findByRole('alert')).textContent).toContain('The request was not sent');
  expect(onClose).not.toHaveBeenCalled();
});
