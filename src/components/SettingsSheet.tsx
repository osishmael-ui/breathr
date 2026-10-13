import { Bell, Headphones, Keyboard, MonitorUp, Palette, Settings2, Timer, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { BINAURAL_PRESETS, BINAURAL_PRESET_IDS, binauralLabel } from '../audio/binaural';
import type { usePlayer } from '../hooks/usePlayer';
import type { BinauralPresetId, CompletionBehavior, CompletionCue, ThemeId } from '../types';

type PlayerController = ReturnType<typeof usePlayer>;

interface SettingsSheetProps {
  open: boolean;
  shortcutsHighlighted: boolean;
  player: PlayerController;
  onClose: () => void;
}

const SHORTCUTS = [
  ['Space', 'Play or pause'],
  ['M', 'Mute or restore volume'],
  ['↑ / ↓', 'Adjust volume'],
  ['1–4', 'Choose a timer preset'],
  ['C', 'Open custom timer'],
  ['P', 'Switch to Pomodoro'],
  ['?', 'Show shortcuts'],
  ['Esc', 'Close a panel'],
];

export function SettingsSheet({ open, shortcutsHighlighted, player, onClose }: SettingsSheetProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);

  if (!open) return null;

  const setPomodoroNumber = (key: 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'rounds', value: number) => {
    const maximum = key === 'focusMinutes' ? 180 : key === 'rounds' ? 8 : 60;
    player.updatePomodoro({ [key]: Math.max(1, Math.min(maximum, Math.round(value))) });
  };

  return (
    <div className="sheet-layer">
      <button className="sheet-backdrop" type="button" onClick={onClose} aria-label="Close settings" />
      <aside className="settings-sheet" aria-label="Breathr settings">
        <header className="sheet-header">
          <div><Settings2 size={18} /><span><small>Breathr</small>Settings</span></div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
        </header>

        <div className="sheet-content">
          <section className="setting-section">
            <h2><Bell size={16} /> When time ends</h2>
            <label className="setting-field">
              <span>Completion sound</span>
              <select value={player.completion.cue} onChange={(event) => player.updateCompletion({ cue: event.target.value as CompletionCue })}>
                <option value="soft">Soft bell</option>
                <option value="double">Double bell</option>
                <option value="none">Silent</option>
              </select>
            </label>
            <label className="setting-field">
              <span>Ambient sound</span>
              <select value={player.completion.behavior} onChange={(event) => player.updateCompletion({ behavior: event.target.value as CompletionBehavior })}>
                <option value="stop">Stop when time ends</option>
                <option value="continue">Keep playing</option>
              </select>
            </label>
            <label className="setting-field">
              <span>Fade out</span>
              <select
                value={player.completion.fadeSeconds}
                disabled={player.completion.behavior === 'continue'}
                onChange={(event) => player.updateCompletion({ fadeSeconds: Number(event.target.value) as 0 | 10 | 30 })}
              >
                <option value={0}>Immediately</option>
                <option value={10}>Over 10 seconds</option>
                <option value={30}>Over 30 seconds</option>
              </select>
            </label>
            <label className="toggle-field">
              <span><b>System notification</b><small>Only shown when Breathr is in the background.</small></span>
              <input type="checkbox" checked={player.completion.notifications} onChange={(event) => void player.requestNotifications(event.target.checked)} />
            </label>
            {player.notificationError && <p className="setting-error" role="alert">{player.notificationError}</p>}
          </section>

          <section className="setting-section">
            <h2><Timer size={16} /> Pomodoro</h2>
            <div className="number-grid">
              <label><span>Focus</span><input type="number" min="1" max="180" value={player.pomodoro.focusMinutes} onChange={(event) => setPomodoroNumber('focusMinutes', Number(event.target.value))} /><small>min</small></label>
              <label><span>Short break</span><input type="number" min="1" max="60" value={player.pomodoro.shortBreakMinutes} onChange={(event) => setPomodoroNumber('shortBreakMinutes', Number(event.target.value))} /><small>min</small></label>
              <label><span>Long break</span><input type="number" min="1" max="60" value={player.pomodoro.longBreakMinutes} onChange={(event) => setPomodoroNumber('longBreakMinutes', Number(event.target.value))} /><small>min</small></label>
              <label><span>Rounds</span><input type="number" min="1" max="8" value={player.pomodoro.rounds} onChange={(event) => setPomodoroNumber('rounds', Number(event.target.value))} /></label>
            </div>
            <label className="setting-field">
              <span>Break audio</span>
              <select value={player.pomodoro.breakAudio} onChange={(event) => player.updatePomodoro({ breakAudio: event.target.value === 'silence' ? 'silence' : 'recover' })}>
                <option value="recover">Downshift at 60%</option>
                <option value="silence">Silence</option>
              </select>
            </label>
            <label className="toggle-field"><span><b>Auto-start breaks</b><small>Begin the next break without a click.</small></span><input type="checkbox" checked={player.pomodoro.autoStartBreaks} onChange={(event) => player.updatePomodoro({ autoStartBreaks: event.target.checked })} /></label>
            <label className="toggle-field"><span><b>Auto-start focus</b><small>Begin focus after a break automatically.</small></span><input type="checkbox" checked={player.pomodoro.autoStartFocus} onChange={(event) => player.updatePomodoro({ autoStartFocus: event.target.checked })} /></label>
          </section>

          <section className="setting-section">
            <h2><Palette size={16} /> Appearance</h2>
            <div className="theme-grid">
              {(['system', 'rill', 'deep', 'mist'] as ThemeId[]).map((theme) => (
                <button key={theme} type="button" className={player.theme === theme ? 'active' : ''} onClick={() => player.setTheme(theme)} aria-pressed={player.theme === theme}>
                  <i data-theme-swatch={theme} />{theme[0].toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </section>

          <section className="setting-section">
            <h2><Headphones size={16} /> Binaural layer</h2>
            <label className="setting-field">
              <span>Beat profile</span>
              <select data-testid="binaural-preset" value={player.binauralPreset} onChange={(event) => player.setBinaural(event.target.value as BinauralPresetId)}>
                <option value="off">Off</option>
                {BINAURAL_PRESET_IDS.map((presetId) => {
                  const preset = BINAURAL_PRESETS[presetId];
                  return <option key={presetId} value={presetId}>{preset.name} · {preset.beatHz} Hz</option>;
                })}
              </select>
            </label>
            <p className="setting-note"><Headphones size={14} /> Stereo headphones are required for left/right separation. The layer plays quietly beneath the selected soundscape.</p>
            <p className="binaural-description" aria-live="polite">
              {player.binauralPreset === 'off'
                ? 'Off by default. Choose a profile to add a subtle stereo beat.'
                : `${binauralLabel(BINAURAL_PRESETS[player.binauralPreset])}. Audio profile only; no particular mental-state effect is promised.`}
            </p>
          </section>

          <section className="setting-section">
            <h2><MonitorUp size={16} /> Session</h2>
            <label className="toggle-field disabled-support" aria-disabled={!player.wakeLock.supported}>
              <span><b>Keep screen awake</b><small>{player.wakeLock.supported ? (player.wakeLock.active ? 'Active for this session.' : 'Active while a timer is running.') : 'Not supported in this browser.'}</small></span>
              <input type="checkbox" disabled={!player.wakeLock.supported} checked={player.keepAwake} onChange={(event) => player.updatePreferences({ keepAwake: event.target.checked })} />
            </label>
          </section>

          <section className={`setting-section shortcut-section ${shortcutsHighlighted ? 'highlighted' : ''}`}>
            <h2><Keyboard size={16} /> Keyboard shortcuts</h2>
            <dl>{SHORTCUTS.map(([key, action]) => <div key={key}><dt>{key}</dt><dd>{action}</dd></div>)}</dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
