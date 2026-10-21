import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReportDialog } from './ReportDialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';

afterEach(cleanup);

const report = (onSubmit = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) => {
  render(<MemoryRouter><ReportDialog open subjectName="Maya Chen" onSubmit={onSubmit} onClose={onClose} /></MemoryRouter>);
  return { onSubmit, onClose };
};

it('requires a reason and a description before sending a report', async () => {
  const { onSubmit, onClose } = report();
  expect(screen.getByRole('dialog', { name: 'Report Maya Chen' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
  expect(screen.getByRole('alert').textContent).toBe('Choose the reason that fits best.');
  await userEvent.click(screen.getByLabelText(/Harassment or threats/));
  await userEvent.type(screen.getByLabelText('What happened?'), 'Rude');
  await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
  expect(screen.getByRole('alert').textContent).toContain('a sentence or two');
  expect(onSubmit).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText('What happened?'), ' messages after I declined.');
  await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
  expect(onSubmit).toHaveBeenCalledWith({ reason: 'harassment', description: 'Rude messages after I declined.' });
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it('keeps the report open and shows the server error when sending fails', async () => {
  const { onClose } = report(vi.fn().mockRejectedValue({ response: { status: 429, data: { detail: 'Too many reports. Try again later.' } } }));
  await userEvent.click(screen.getByLabelText(/Spam or selling/));
  await userEvent.type(screen.getByLabelText('What happened?'), 'Selling paid tutoring.');
  await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
  expect((await screen.findByRole('alert')).textContent).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});

it('closes the report on Escape and links to the guidelines', async () => {
  const { onClose } = report();
  expect(screen.getByRole('link', { name: 'community guidelines' }).getAttribute('href')).toBe('/guidelines');
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});

it('confirms or cancels from an accessible alert dialog', async () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined), onCancel = vi.fn();
  render(<ConfirmDialog open title="Block Maya?" description="You won't see each other." confirmLabel="Block" tone="danger" onConfirm={onConfirm} onCancel={onCancel} />);
  const dialog = screen.getByRole('alertdialog', { name: 'Block Maya?' });
  expect(dialog.getAttribute('aria-describedby')).toBe('confirm-description');
  await userEvent.click(screen.getByRole('button', { name: 'Block' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await userEvent.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(2);
});

it('renders nothing while closed', () => {
  render(<ConfirmDialog open={false} title="Hidden" description="" confirmLabel="Go" onConfirm={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.queryByRole('alertdialog')).toBeNull();
});
