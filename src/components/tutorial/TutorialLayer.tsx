import React from 'react';
import type { TutorialPhase, TutorialStepConfig } from '../../hooks/useTutorial.ts';
import { WelcomeModal } from './WelcomeModal.tsx';
import { SummaryCard } from './SummaryCard.tsx';
import { Spotlight, type SpotlightRect } from './Spotlight.tsx';
import { TourTooltip } from './TourTooltip.tsx';
import { Confetti } from './Confetti.tsx';

interface TutorialLayerProps {
  phase: TutorialPhase;
  currentStep: TutorialStepConfig | null;
  stepIndex: number;
  totalSteps: number;
  targetRect: SpotlightRect | null;
  isCurrentActionComplete: boolean;
  skipAnimations: boolean;
  onToggleSkipAnimations: () => void;
  onSelectYes: () => void;
  onSelectNo: () => void;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const TutorialLayer: React.FC<TutorialLayerProps> = ({
  phase,
  currentStep,
  stepIndex,
  totalSteps,
  targetRect,
  isCurrentActionComplete,
  skipAnimations,
  onToggleSkipAnimations,
  onSelectYes,
  onSelectNo,
  onClose,
  onNext,
  onBack,
}) => {
  if (phase === 'welcome') {
    return (
      <WelcomeModal
        onSelectYes={onSelectYes}
        onSelectNo={onSelectNo}
        onDismiss={onClose}
      />
    );
  }

  if (phase === 'summary') {
    return (
      <SummaryCard
        onGotIt={onClose}
        onStartTutorialAnyway={onSelectNo}
      />
    );
  }

  if (phase === 'walkthrough' && currentStep) {
    return (
      <>
        <Spotlight
          rect={targetRect}
          allowCutoutInteraction={Boolean(currentStep.requireAction)}
          skipAnimations={skipAnimations}
        />
        <TourTooltip
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          targetRect={targetRect}
          actionUnlocked={isCurrentActionComplete}
          skipAnimations={skipAnimations}
          onToggleSkipAnimations={onToggleSkipAnimations}
          onNext={onNext}
          onBack={onBack}
          onSkip={onClose}
        />
      </>
    );
  }

  if (phase === 'complete') {
    return (
      <Confetti
        skipAnimations={skipAnimations}
        onFinish={onClose}
        onReplay={onSelectNo}
      />
    );
  }

  return null;
};

export default TutorialLayer;

