import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from '../components/Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { queryByRole } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test">Content</Modal>,
    );
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders title and children when open', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="My Modal">
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('My Modal')).toBeTruthy();
    expect(screen.getByText('Modal body')).toBeTruthy();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} title="T">Body</Modal>,
    );
    // Click the outermost div (the overlay wrapper)
    fireEvent.click(container.querySelector('[role="dialog"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when panel is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="T">Body</Modal>,
    );
    fireEvent.click(screen.getByText('Body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="T">Body</Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer slot', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="T" footer={<button>Confirm</button>}>
        Body
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });
});
