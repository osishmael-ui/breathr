import { Check, Download, Headphones, Infinity as InfinityIcon, Pause, Play, RefreshCw, RotateCcw, Settings, SkipForward, Timer, Volume1, Volume2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { SOUND_IDS, SOUND_PRESETS } from './audio/presets';
import { AboutBreathr } from './components/AboutBreathr';
import { BinauralStatus } from './components/BinauralStatus';
import { SettingsSheet } from './components/SettingsSheet';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlayer } from './hooks/usePlayer';
import { useTheme } from './hooks/useTheme';
import { usePwaUpdate } from './hooks/usePwaUpdate';

const TIMER_OPTIONS = [0, 25, 50, 90];
const WAVE_BAR_COUNT = 48;
const BREATH_PATTERNS = {
  calm: { name: 'Calm 4–6', inhale: 4, hold: 0, exhale: 6, description: 'A gentle inhale followed by a longer exhale.' },
  settle: { name: 'Settle 4–4–6', inhale: 4, hold: 4, exhale: 6, description: 'A steady rhythm for arriving in the present moment.' },
  box: { name: 'Box 4–4–4–4', inhale: 4, hold: 4, exhale: 4, rest: 4, description: 'An even square breath for a clear, balanced reset.' },
} as const;
type BreathPatternId = keyof typeof BREATH_PATTERNS;

export default function App() {
  const player = usePlayer();
  const installPrompt = useInstallPrompt();
  const applyUpdate = usePwaUpdate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsHighlighted, setShortcutsHighlighted] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(String(player.customTimerMinutes));
  const [breathPattern, setBreathPattern] = useState<BreathPatternId>('calm');
  const [breathElapsed, setBreathElapsed] = useState(0);
  const activeSound = SOUND_PRESETS[player.timer.mode === 'pomodoro' && player.timer.phase !== 'focus' && player.pomodoro.breakAudio === 'recover' ? 'downshift' : player.soundId];
  useTheme(player.theme);

  useEffect(() => {
    if (!player.isPlaying) {
      setBreathElapsed(0);
      return undefined;
    }
    const interval = window.setInterval(() => setBreathElapsed((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [player.isPlaying, breathPattern]);

  const pattern = BREATH_PATTERNS[breathPattern];
  const breathCycle = pattern.inhale + pattern.hold + pattern.exhale + ('rest' in pattern ? pattern.rest : 0);
  const breathPosition = breathElapsed % breathCycle;
  const breathPhase = breathPosition < pattern.inhale
    ? { label: 'Inhale', seconds: pattern.inhale - breathPosition, duration: pattern.inhale, className: 'inhale' }
    : breathPosition < pattern.inhale + pattern.hold
      ? { label: 'Hold', seconds: pattern.inhale + pattern.hold - breathPosition, duration: pattern.hold, className: 'hold' }
      : breathPosition < pattern.inhale + pattern.hold + pattern.exhale
        ? { label: 'Exhale', seconds: pattern.inhale + pattern.hold + pattern.exhale - breathPosition, duration: pattern.exhale, className: 'exhale' }
        : { label: 'Rest', seconds: breathCycle - breathPosition, duration: 'rest' in pattern ? pattern.rest : 1, className: 'rest' };
  const waveEnergy = player.isPlaying
    ? ({ inhale: 1, hold: 0.82, exhale: 0.52, rest: 0.34 } as const)[breathPhase.className as 'inhale' | 'hold' | 'exhale' | 'rest'] ?? 0.34
    : 0.26;
  const waveBars = Array.from({ length: WAVE_BAR_COUNT }, (_, index) => {
    const angle = (index / WAVE_BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
    const contour = Math.sin(angle * 3 + breathElapsed * 0.85) * 5 + Math.sin(angle * 7 - breathElapsed * 0.55) * 3;
    const inner = 114;
    const length = 8 + waveEnergy * (20 + contour);
    const outer = inner + Math.max(8, length);
    return {
      index,
      x1: 200 + Math.cos(angle) * inner,
      y1: 200 + Math.sin(angle) * inner,
      x2: 200 + Math.cos(angle) * outer,
      y2: 200 + Math.sin(angle) * outer,
      opacity: 0.35 + waveEnergy * 0.5,
    };
  });

  const closePanels = () => {
    setCustomOpen(false);
    setSettingsOpen(false);
    setShortcutsHighlighted(false);
  };

  const chooseTimer = (minutes: number) => {
    player.setTimer(minutes);
    setCustomOpen(false);
  };

  const submitCustomTimer = (event: FormEvent) => {
    event.preventDefault();
    const minutes = Math.max(1, Math.min(240, Number(customMinutes) || player.customTimerMinutes));
    setCustomMinutes(String(minutes));
    player.setCustomTimer(minutes);
    setCustomOpen(false);
  };

  useKeyboardShortcuts({
    toggle: player.toggle,
    toggleMute: player.toggleMute,
    adjustVolume: (delta) => player.setVolume(player.volume + delta),
    selectTimer: chooseTimer,
    openCustomTimer: () => setCustomOpen(true),
    selectPomodoro: player.selectPomodoro,
    openShortcuts: () => { setSettingsOpen(true); setShortcutsHighlighted(true); },
    closePanels,
  });

  const timerIsCustom = player.timer.mode === 'countdown' && !TIMER_OPTIONS.slice(1).includes(player.timerMinutes);
  const silentRunningBreak = player.timer.status === 'running' && player.timer.mode === 'pomodoro' && player.timer.phase !== 'focus' && player.pomodoro.breakAudio === 'silence';
  const playLabel = player.isPlaying || silentRunningBreak
    ? 'Pause session'
    : player.timer.status === 'running' ? 'Resume sound' : 'Play sound';

  return (
    <main className="app" style={{ '--active-tone': activeSound.warmth } as React.CSSProperties}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="/" aria-label="Breathr home">
          <span className="brand-mark"><img src="/icon.svg" alt="" /></span>
          <span>Breathr</span>
        </a>
        <div className="topbar-actions">
          <p>flow past the noise</p>
          {!installPrompt.installed && <button className="install-button" type="button" onClick={installPrompt.install}><Download size={15} /> Install Breathr</button>}
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings size={17} /></button>
        </div>
      </header>

      {installPrompt.showHelp && (
        <aside className="install-help" aria-label="Install Breathr instructions">
          <div><strong>Install Breathr</strong><p>In Chrome or Edge, use the install icon in the address bar. On macOS Safari, choose <b>File → Add to Dock</b>.</p></div>
          <button type="button" onClick={installPrompt.dismissHelp} aria-label="Close installation instructions"><X size={17} /></button>
        </aside>
      )}

      <section className="player-shell" aria-label="Breathing and sound player">
        <div className="intro">
          <span className="kicker"><Headphones size={14} /> Make room for calm</span>
          <h1>Return to your<br /><em>breath.</em></h1>
          <p>Choose a rhythm, press play, and let your breathing lead you back to the present.</p>
        </div>

        <div
          className={`orb-wrap ${player.isPlaying ? 'is-playing' : ''} ${breathPhase.className}`}
          style={{ '--phase-duration': `${breathPhase.duration}s` } as React.CSSProperties}
          aria-live="polite"
        >
          <svg className="breath-wave" viewBox="0 0 400 400" aria-hidden="true">
            <defs>
              <linearGradient id="breath-wave-gradient" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
                <stop stopColor="#eadcff" /><stop offset="0.52" stopColor="#b899e4" /><stop offset="1" stopColor="#70508e" />
              </linearGradient>
              <radialGradient id="breath-wave-core" cx="34%" cy="28%" r="72%">
                <stop stopColor="#fffaff" /><stop offset="0.58" stopColor="#e6d6ff" /><stop offset="1" stopColor="#b18cda" />
              </radialGradient>
              <filter id="breath-wave-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.65" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle className="breath-wave-guide breath-wave-guide-outer" cx="200" cy="200" r="145" />
            <circle className="breath-wave-guide" cx="200" cy="200" r="114" />
            <g className="breath-wave-bars" filter="url(#breath-wave-glow)">
              {waveBars.map((bar) => <line key={bar.index} {...bar} stroke="url(#breath-wave-gradient)" strokeOpacity={bar.opacity} />)}
            </g>
            <circle className="breath-wave-core" cx="200" cy="200" r="86" />
          </svg>
          <div className="breath-instruction">
            <span>{player.isPlaying ? breathPhase.label : player.timer.status === 'completed' ? 'Complete' : 'Ready'}</span>
            <strong>{player.isPlaying ? breathPhase.seconds : '—'}</strong>
            <small>{player.isPlaying ? 'seconds' : pattern.name}</small>
          </div>
        </div>

        <button className="session-toggle" type="button" onClick={player.toggle} aria-label={playLabel}>
          {player.status === 'starting' ? <span className="loader" /> : player.isPlaying || silentRunningBreak ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          <span>{player.isPlaying || silentRunningBreak ? 'Pause session' : `Begin ${pattern.name}`}</span>
        </button>

        <div className="time-readout" aria-live="polite"><span>{player.formattedTime}</span><small>{player.timerCaption}</small></div>
        <BinauralStatus presetId={player.binauralPreset} playing={player.isPlaying} />
        {player.status === 'unsupported' && <p className="error">Audio playback is not available in this browser.</p>}

        <div className="controls-card">
          <div className="mode-row" aria-label="Session mode">
            <button type="button" className={player.timer.mode !== 'pomodoro' ? 'active' : ''} onClick={() => chooseTimer(player.timerMinutes)}>Focus timer</button>
            <button type="button" className={player.timer.mode === 'pomodoro' ? 'active' : ''} onClick={player.selectPomodoro}>Pomodoro</button>
          </div>

          <div className="breath-grid" role="list" aria-label="Breathing patterns">
            {(Object.keys(BREATH_PATTERNS) as BreathPatternId[]).map((patternId) => {
              const option = BREATH_PATTERNS[patternId];
              const active = patternId === breathPattern;
              return <button key={patternId} type="button" className={`breath-option ${active ? 'active' : ''}`} onClick={() => setBreathPattern(patternId)} aria-pressed={active}>
                <span><small>{option.inhale} in · {option.exhale} out</small>{option.name}</span>
              </button>;
            })}
          </div>

          <div className="sound-grid" role="list" aria-label="Breathr soundtracks">
            {SOUND_IDS.map((soundId) => {
              const sound = SOUND_PRESETS[soundId];
              const active = soundId === player.soundId;
              return <button key={soundId} type="button" className={`sound-option ${active ? 'active' : ''}`} onClick={() => player.setSound(soundId)} aria-pressed={active}>
                <span className="sound-dot" style={{ background: sound.warmth }} /><span><small>{sound.eyebrow}</small>{sound.name}</span><i className="mini-wave"><b /><b /><b /><b /></i>
              </button>;
            })}
          </div>

          <div className="control-row">
            <div className="volume-control"><Volume1 size={18} /><label><span className="sr-only">Volume</span><input type="range" min="0" max="100" value={player.volume} onChange={(event) => player.setVolume(Number(event.target.value))} /></label><Volume2 size={18} /><output>{Math.round(player.volume)}%</output></div>
            <div className="timer-wrap">
              <div className="timer-control"><Timer size={17} />{TIMER_OPTIONS.map((minutes) => <button key={minutes} type="button" className={player.timer.mode !== 'pomodoro' && player.timerMinutes === minutes ? 'active' : ''} onClick={() => chooseTimer(minutes)} aria-label={minutes === 0 ? 'Open-ended timer' : `${minutes} minute timer`}>{minutes === 0 ? <InfinityIcon size={16} /> : `${minutes}m`}</button>)}<button type="button" className={timerIsCustom ? 'active' : ''} onClick={() => setCustomOpen((current) => !current)} aria-expanded={customOpen}>Custom</button></div>
              {customOpen && <form className="custom-timer" onSubmit={submitCustomTimer}><label><span>Minutes</span><input autoFocus type="number" min="1" max="240" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} /></label><button type="submit"><Check size={14} /> Apply</button></form>}
            </div>
          </div>

          {player.timer.mode === 'pomodoro' && <div className="pomodoro-actions"><button type="button" onClick={player.skipPhase}><SkipForward size={14} /> Skip phase</button><button type="button" onClick={player.resetPomodoro}><RotateCcw size={14} /> Reset cycle</button></div>}
        </div>

        <p className="sound-description">{player.isPlaying ? `${breathPhase.label} for ${breathPhase.seconds} seconds · ` : ''}{pattern.description} {activeSound.description}</p>
      </section>

      <footer><span>Breath-led relaxation</span><span className="footer-dot" /><span>No account. Sessions stay local.</span></footer>

      <AboutBreathr />

      {player.completionMessage && <div className="completion-toast" role="status"><span><Check size={17} /><strong>{player.completionMessage}</strong></span><button type="button" onClick={player.dismissCompletion} aria-label="Dismiss completion message"><X size={16} /></button></div>}
      {applyUpdate && <div className="update-toast" role="status"><span><strong>A fresh version is ready.</strong> Update without losing your settings.</span><button type="button" onClick={applyUpdate}><RefreshCw size={15} /> Update</button></div>}
      <SettingsSheet open={settingsOpen} shortcutsHighlighted={shortcutsHighlighted} player={player} onClose={closePanels} />
    </main>
  );
}
