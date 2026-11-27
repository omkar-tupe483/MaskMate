import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { App } from '../App.tsx';
import { WelcomeModal } from '../components/tutorial/WelcomeModal.tsx';
import { SummaryCard } from '../components/tutorial/SummaryCard.tsx';
import { TUTORIAL_STORAGE_KEY } from '../hooks/useTutorial.ts';

describe('Accessibility checks (jest-axe)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('WelcomeModal and SummaryCard have zero axe accessibility violations', async () => {
    const w = render(
      <WelcomeModal onSelectYes={() => {}} onSelectNo={() => {}} onDismiss={() => {}} />
    );
    const welcomeResults = await axe(w.container);
    expect(welcomeResults.violations).toEqual([]);
    w.unmount();

    const s = render(
      <SummaryCard onGotIt={() => {}} onStartTutorialAnyway={() => {}} />
    );
    const summaryResults = await axe(s.container);
    expect(summaryResults.violations).toEqual([]);
  });

  it('Main App with loaded sample, Pseudonym Map, and Custom Patterns passes axe cleanly', async () => {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'seen');
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: /Load Sample/i }));
    await user.click(screen.getByRole('radio', { name: 'Pseudonymize' }));
    await user.click(screen.getByRole('button', { name: /Custom Regex Patterns/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pseudonym Map/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

