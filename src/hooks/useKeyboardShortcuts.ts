import { useEffect } from 'react';

export interface ShortcutActions {
  toggle: () => void;
  toggleMute: () => void;
  adjustVolume: (delta: number) => void;
  selectTimer: (minutes: number) => void;
  openCustomTimer: () => void;
  selectPomodoro: () => void;
  openShortcuts: () => void;
  closePanels: () => void;
}

const isEditable = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, select, textarea, [contenteditable="true"]'));
};

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === ' ') { event.preventDefault(); actions.toggle(); }
      else if (key === 'm') actions.toggleMute();
      else if (key === 'arrowup') { event.preventDefault(); actions.adjustVolume(5); }
      else if (key === 'arrowdown') { event.preventDefault(); actions.adjustVolume(-5); }
      else if (key === '1') actions.selectTimer(0);
      else if (key === '2') actions.selectTimer(25);
      else if (key === '3') actions.selectTimer(50);
      else if (key === '4') actions.selectTimer(90);
      else if (key === 'c') actions.openCustomTimer();
      else if (key === 'p') actions.selectPomodoro();
      else if (key === '?') actions.openShortcuts();
      else if (key === 'escape') actions.closePanels();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
