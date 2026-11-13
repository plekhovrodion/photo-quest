import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Feedback from '@uchi/feedback-form';
import type { feedbackConfig } from '../api/feedback';

export function mountFeedbackWindow(
  element: HTMLElement,
  config: NonNullable<ReturnType<typeof feedbackConfig>>,
  onClose: () => void,
): () => void {
  const root = createRoot(element);
  root.render(createElement(Feedback, {
    config,
    visible: true,
    zIndex: 3500,
    className: 'feedback-form',
    onClose,
  }));
  return () => root.unmount();
}
