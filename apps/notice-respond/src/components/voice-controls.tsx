/* ═══════════════════════════════════════════════════════════
   VOICE CONTROLS — reusable React component for narration,
   dictation, and audio summary features.
   ═══════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  NarrationController,
  DictationController,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
  loadVoiceSettings,
  saveVoiceSettings,
  type NarrationState,
} from "../platform/speech";
import type { NarrationScript, VoiceSettings, DictationResult } from "../domain/voice";

/* ── Narration button ── */

interface NarrationButtonProps {
  script: NarrationScript | null;
  label?: string;
  compact?: boolean;
}

export function NarrationButton({ script, label = "Listen", compact = false }: NarrationButtonProps) {
  const [state, setState] = useState<NarrationState | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const controllerRef = useRef<NarrationController | null>(null);
  const supported = isSpeechSynthesisSupported();

  useEffect(() => {
    if (!supported) return;
    controllerRef.current = new NarrationController(settings, {
      onStateChange: setState,
    });
    return () => controllerRef.current?.stop();
  }, [supported]);

  const handlePlay = useCallback(() => {
    if (!controllerRef.current || !script) return;
    if (state?.isSpeaking && !state?.isPaused) {
      controllerRef.current.pause();
    } else if (state?.isPaused) {
      controllerRef.current.resume();
    } else {
      controllerRef.current.speak(script);
    }
  }, [script, state]);

  const handleStop = useCallback(() => {
    controllerRef.current?.stop();
    setState(null);
  }, []);

  if (!supported) {
    return (
      <span className="text-xs text-muted-foreground/60" title="Speech synthesis not available">
        {compact ? "🔇" : "Voice not available"}
      </span>
    );
  }

  if (!script) {
    return null;
  }

  const isSpeaking = state?.isSpeaking && !state?.isPaused;
  const isPaused = state?.isPaused;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePlay}
        className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-card px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-stamp hover:text-stamp"
        title={isSpeaking ? "Pause" : isPaused ? "Resume" : "Play narration"}
      >
        {isSpeaking ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5v7a4.5 4.5 0 0 1-9 0v-7a4.5 4.5 0 0 1 9 0Z M12 4v4.5 M10 4h4" />
          </svg>
        )}
        {compact ? "" : label}
      </button>

      {state?.isSpeaking && (
        <button
          type="button"
          onClick={handleStop}
          className="inline-flex items-center gap-1 rounded-full border border-rule px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
          title="Stop"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      )}

      {state?.isSpeaking && state.totalSegments > 0 && (
        <span className="text-xs text-muted-foreground">
          {state.currentSegmentIndex + 1}/{state.totalSegments}
        </span>
      )}
    </div>
  );
}

/* ── Dictation input wrapper ── */

interface DictationInputProps {
  value: string;
  onChange: (value: string) => void;
  field?: string;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  rows?: number;
}

export function DictationInput({
  value,
  onChange,
  field,
  placeholder,
  label,
  multiline = false,
  rows = 3,
}: DictationInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const controllerRef = useRef<DictationController | null>(null);
  const supported = isSpeechSynthesisSupported() && isSpeechRecognitionSupported() && settings.dictationEnabled;

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;
    controllerRef.current = new DictationController({
      onResult: (result: DictationResult) => {
        if (result.isFinal) {
          const newValue = value ? value + " " + result.transcript : result.transcript;
          onChange(newValue);
          setInterimText("");
        } else {
          setInterimText(result.transcript);
        }
      },
      onError: () => {
        setIsListening(false);
        setInterimText("");
      },
      onEnd: () => {
        setIsListening(false);
        setInterimText("");
      },
    });
    return () => controllerRef.current?.stop();
  }, [value, onChange]);

  const toggleDictation = useCallback(() => {
    if (!controllerRef.current) return;
    if (isListening) {
      controllerRef.current.stop();
      setIsListening(false);
    } else {
      const started = controllerRef.current.start(field);
      setIsListening(started);
    }
  }, [isListening, field]);

  if (label) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="input-label">{label}</label>
          {supported && (
            <button
              type="button"
              onClick={toggleDictation}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                isListening
                  ? "bg-red-500/10 text-red-600 animate-pulse"
                  : "text-muted-foreground hover:text-stamp"
              }`}
              title={isListening ? "Stop dictation" : "Start voice dictation"}
            >
              {isListening ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Listening...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 11a7 7 0 0 1-14 0 M12 18v4 M8 22h8" />
                  </svg>
                  Dictate
                </>
              )}
            </button>
          )}
        </div>
        {multiline ? (
          <textarea
            className="input-field mt-1"
            rows={rows}
            value={value + (interimText ? " " + interimText : "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            className="input-field mt-1"
            value={value + (interimText ? " " + interimText : "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
        {isListening && (
          <p className="mt-1 text-xs text-stamp">Speak now. Your words will appear as you speak.</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          className="input-field"
          rows={rows}
          value={value + (interimText ? " " + interimText : "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input-field"
          value={value + (interimText ? " " + interimText : "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {supported && (
        <button
          type="button"
          onClick={toggleDictation}
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${
            isListening ? "text-red-600" : "text-muted-foreground hover:text-stamp"
          }`}
          title={isListening ? "Stop dictation" : "Start voice dictation"}
        >
          {isListening ? "⏹" : "🎤"}
        </button>
      )}
    </div>
  );
}

/* ── Voice settings panel ── */

interface VoiceSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function VoiceSettingsPanel({ open, onClose }: VoiceSettingsPanelProps) {
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);

  const update = (updates: Partial<VoiceSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveVoiceSettings(next);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="envelope-card max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl">Voice Settings</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">Voice enabled</span>
            <input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="accent-stamp" />
          </label>

          <div>
            <label className="text-sm text-muted-foreground">Speed: {settings.rate.toFixed(1)}x</label>
            <input type="range" min={0.5} max={2} step={0.1} value={settings.rate} onChange={(e) => update({ rate: parseFloat(e.target.value) })} className="w-full accent-stamp" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Pitch: {settings.pitch.toFixed(1)}</label>
            <input type="range" min={0} max={2} step={0.1} value={settings.pitch} onChange={(e) => update({ pitch: parseFloat(e.target.value) })} className="w-full accent-stamp" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Volume: {Math.round(settings.volume * 100)}%</label>
            <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => update({ volume: parseFloat(e.target.value) })} className="w-full accent-stamp" />
          </div>

          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-narrate findings</span>
            <input type="checkbox" checked={settings.narrateFindings} onChange={(e) => update({ narrateFindings: e.target.checked })} className="accent-stamp" />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm">Voice dictation</span>
            <input type="checkbox" checked={settings.dictationEnabled} onChange={(e) => update({ dictationEnabled: e.target.checked })} className="accent-stamp" />
          </label>

          <div>
            <label className="text-sm text-muted-foreground">Preferred voice</label>
            <select
              value={settings.preferredGender}
              onChange={(e) => update({ preferredGender: e.target.value as "male" | "female" | "any" })}
              className="input-field mt-1"
            >
              <option value="any">Any</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Voice indicator badge ── */

export function VoiceBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stamp/10 px-2 py-0.5 text-xs font-mono text-stamp">
      <span className="h-1.5 w-1.5 rounded-full bg-stamp animate-pulse" />
      VOICE
    </span>
  );
}
