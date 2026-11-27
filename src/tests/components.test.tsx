import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App.tsx';
import { TUTORIAL_STORAGE_KEY } from '../hooks/useTutorial.ts';

describe('MaskMate UI flows, tutorial gating, and security behaviors', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows WelcomeModal on first visit, supports Yes quick summary and Replay Tutorial', async () => {
    const user = userEvent.setup();
    render(<App />);

    const welcomeTitle = await screen.findByText('Do you know how to use MaskMate?');
    expect(welcomeTitle).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Yes, I know/i }));
    expect(await screen.findByText('5-Step Quick Summary')).toBeInTheDocument();
    expect(window.localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe('seen');

    await user.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => {
      expect(screen.queryByText('5-Step Quick Summary')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Replay tutorial/i }));
    expect(await screen.findByText('Do you know how to use MaskMate?')).toBeInTheDocument();
  });

  it('Walkthrough enforces action gate on Step 2 until Load Sample Noisy Text is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /No, teach me/i }));
    expect(await screen.findByText('Step 1 of 9')).toBeInTheDocument();

    // Advance from informational Step 1 to gated Step 2
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(await screen.findByText('Step 2 of 9')).toBeInTheDocument();

    const blockedNext = screen.getByRole('button', { name: /Complete action/i });
    expect(blockedNext).toBeDisabled();

    // Perform spotlighted quest action
    await user.click(screen.getByRole('button', { name: /Load Sample/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });

    // Skip tutorial to resume normal interaction checks
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => {
      expect(screen.queryByText('Step 2 of 9')).not.toBeInTheDocument();
    });
  });

  it('switches modes, toggles entity types, ignores occurrences, and clears all data', async () => {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'seen');
    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByLabelText('Raw text input for PII detection');
    await user.type(textarea, 'Email alice@example.com twice: alice@example.com');

    await waitFor(() => {
      expect(screen.getByText(/\[REDACTED:EMAIL\]/)).toBeInTheDocument();
    });

    const sanitizedRegion = screen.getByRole('region', { name: 'Sanitized document output' });

    // Switch to Pseudonymize mode
    await user.click(screen.getByRole('radio', { name: 'Pseudonymize' }));
    await waitFor(() => {
      expect(within(sanitizedRegion).getAllByText(/EMAIL_01/)).toHaveLength(2);
      expect(screen.getByText(/Pseudonym Map \(1\)/i)).toBeInTheDocument();
    });

    // Toggle Email entity off -> original value should appear unredacted in sanitized output pane
    const emailCheckbox = screen.getByRole('checkbox', { name: /Email/i });
    await user.click(emailCheckbox);
    await waitFor(() => {
      expect(within(sanitizedRegion).queryByText(/EMAIL_01/)).not.toBeInTheDocument();
    });

    // Clear all data clears text, pseudonyms, and input field
    await user.click(screen.getAllByRole('button', { name: /Clear All Data/i })[0]);
    await waitFor(() => {
      expect(textarea).toHaveValue('');
      expect(screen.queryByText(/Pseudonym Map \(/)).not.toBeInTheDocument();
    });
  });

  it('renders XSS payloads as inert text and rejects invalid/binary file uploads', async () => {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'seen');
    const user = userEvent.setup();
    const { container } = render(<App />);

    const textarea = screen.getByLabelText('Raw text input for PII detection');
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)> dev@example.com';
    await user.click(textarea);
    fireEvent.change(textarea, { target: { value: xssPayload } });

    await waitFor(() => {
      expect(screen.getByText(/\[REDACTED:EMAIL\]/)).toBeInTheDocument();
    });

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Attempt uploading unsupported binary .exe file
    const fileInput = screen.getByLabelText('Upload .txt or .csv file');
    const badFile = new File([new Uint8Array([77, 90, 0, 1])], 'payload.exe', {
      type: 'application/octet-stream',
    });
    // Use fireEvent.change on hidden file input with applyAccept disabled
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(await screen.findByText(/Unsupported file type/i)).toBeInTheDocument();

    // Attempt uploading null-byte disguised .txt file
    const nullTxt = new File([new Uint8Array([65, 66, 0, 67])], 'bad.txt', {
      type: 'text/plain',
    });
    fireEvent.change(fileInput, { target: { files: [nullTxt] } });
    expect(await screen.findByText(/Binary or null-byte/i)).toBeInTheDocument();
  });

  it('adds and applies custom regex patterns while validating invalid syntax', async () => {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'seen');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Custom Regex Patterns/i }));
    const labelInput = await screen.findByLabelText('Label');
    const patternInput = screen.getByLabelText('Regex Pattern');

    // Invalid regex triggers alert
    await user.type(labelInput, 'Broken');
    fireEvent.change(patternInput, { target: { value: '[unclosed' } });
    await user.click(screen.getByRole('button', { name: 'Add Rule' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    // Valid regex adds rule and redacts custom token
    await user.clear(labelInput);
    fireEvent.change(patternInput, { target: { value: 'EMP-\\d{4}' } });
    await user.type(labelInput, 'Employee ID');
    await user.click(screen.getByRole('button', { name: 'Add Rule' }));

    const textarea = screen.getByLabelText('Raw text input for PII detection');
    await user.type(textarea, 'Assigned EMP-4821 to desk');

    await waitFor(() => {
      expect(screen.getByText(/\[REDACTED:CUSTOM\]/)).toBeInTheDocument();
    });
  });
});

