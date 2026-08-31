/* ═══════════════════════════════════════════════════════════
   SPEECH PLATFORM — Web Speech API wrapper
   Provides text-to-speech (synthesis) and speech-to-text
   (recognition) capabilities for the browser.
   
   This module is browser-only and must not be imported
   during SSR. Guard with typeof window checks.
   ═══════════════════════════════════════════════════════════ */

import type { NarrationScript, NarrationSegment, VoiceSettings, DictationResult } from "../domain/voice";

/* ── Feature detection ── */

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

/* ── Voice list ── */

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function selectVoice(settings: VoiceSettings): SpeechSynthesisVoice | undefined {
  const voices = getAvailableVoices();
  if (!voices.length) return undefined;

  // If a specific voice is selected, use it
  if (settings.voiceURI) {
    const match = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (match) return match;
  }

  // Filter by gender preference
  let candidates = voices;
  if (settings.preferredGender !== "any") {
    const genderFiltered = voices.filter((v) =>
      settings.preferredGender === "female"
        ? v.name.match(/female|woman|samantha|victoria|karen|moira|tessa|fiona|serena/i)
        : v.name.match(/male|man|daniel|alex|fred|tom|aaron/i),
    );
    if (genderFiltered.length) candidates = genderFiltered;
  }

  // Prefer English voices
  const english = candidates.filter((v) => v.lang.startsWith("en"));
  if (english.length) candidates = english;

  return candidates[0];
}

/* ── Narration state ── */

export interface NarrationState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  scriptId: string;
  startedAt?: string;
}

export function createNarrationState(script: NarrationScript): NarrationState {
  return {
    isSpeaking: false,
    isPaused: false,
    currentSegmentIndex: 0,
    totalSegments: script.segments.length,
    scriptId: script.id,
  };
}

/* ── Narration controller ── */

export class NarrationController {
  private synth: SpeechSynthesis | null = null;
  private utterances: SpeechSynthesisUtterance[] = [];
  private state: NarrationState | null = null;
  private settings: VoiceSettings;
  private voice: SpeechSynthesisVoice | undefined;
  private onStateChange?: (state: NarrationState) => void;
  private onSegmentChange?: (index: number, segment: NarrationSegment) => void;
  private onComplete?: () => void;
  private currentSegment = 0;

  constructor(settings: VoiceSettings, callbacks?: {
    onStateChange?: (state: NarrationState) => void;
    onSegmentChange?: (index: number, segment: NarrationSegment) => void;
    onComplete?: () => void;
  }) {
    this.settings = settings;
    this.onStateChange = callbacks?.onStateChange;
    this.onSegmentChange = callbacks?.onSegmentChange;
    this.onComplete = callbacks?.onComplete;

    if (isSpeechSynthesisSupported()) {
      this.synth = window.speechSynthesis;
      this.voice = selectVoice(settings);
    }
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  speak(script: NarrationScript): void {
    if (!this.synth || !this.settings.enabled) return;
    this.stop();

    this.state = createNarrationState(script);
    this.state.isSpeaking = true;
    this.state.startedAt = new Date().toISOString();
    this.currentSegment = 0;
    this.utterances = [];

    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      const utterance = new SpeechSynthesisUtterance(segment.text);

      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;

      // Adjust rate for alerts (slightly slower for critical info)
      if (segment.role === "alert" && segment.priority === "critical") {
        utterance.rate = Math.max(0.7, this.settings.rate * 0.85);
      }

      utterance.onstart = () => {
        this.currentSegment = i;
        this.state = { ...this.state!, currentSegmentIndex: i, isSpeaking: true };
        this.onSegmentChange?.(i, segment);
        this.onStateChange?.(this.state);
      };

      utterance.onend = () => {
        // Apply pause after segment
        if (segment.pauseAfter > 0 && i < script.segments.length - 1) {
          setTimeout(() => {
            // Continue to next segment
          }, segment.pauseAfter);
        }
      };

      this.utterances.push(utterance);
    }

    // Queue all utterances
    for (const u of this.utterances) {
      this.synth.speak(u);
    }

    // Handle completion
    if (this.utterances.length > 0) {
      const lastUtterance = this.utterances[this.utterances.length - 1];
      lastUtterance.addEventListener("end", () => {
        this.state = { ...this.state!, isSpeaking: false, currentSegmentIndex: script.segments.length - 1 };
        this.onStateChange?.(this.state);
        this.onComplete?.();
      });
    }

    this.onStateChange?.(this.state);
  }

  pause(): void {
    if (!this.synth || !this.state?.isSpeaking) return;
    this.synth.pause();
    this.state = { ...this.state, isPaused: true };
    this.onStateChange?.(this.state);
  }

  resume(): void {
    if (!this.synth || !this.state?.isPaused) return;
    this.synth.resume();
    this.state = { ...this.state, isPaused: false };
    this.onStateChange?.(this.state);
  }

  stop(): void {
    if (!this.synth) return;
    this.synth.cancel();
    if (this.state) {
      this.state = { ...this.state, isSpeaking: false, isPaused: false };
      this.onStateChange?.(this.state);
    }
  }

  getState(): NarrationState | null {
    return this.state;
  }
}

/* ── Dictation controller ── */

export class DictationController {
  private recognition: any = null;
  private isListening = false;
  private onResult?: (result: DictationResult) => void;
  private onError?: (error: string) => void;
  private onEnd?: () => void;
  private field?: string;

  constructor(callbacks?: {
    onResult?: (result: DictationResult) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }) {
    this.onResult = callbacks?.onResult;
    this.onError = callbacks?.onError;
    this.onEnd = callbacks?.onEnd;
  }

  isSupported(): boolean {
    return isSpeechRecognitionSupported();
  }

  start(field?: string): boolean {
    if (!this.isSupported() || this.isListening) return false;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.field = field;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript && this.onResult) {
        this.onResult({
          id: crypto.randomUUID(),
          transcript: finalTranscript,
          confidence: event.results[event.resultIndex][0].confidence || 0,
          isFinal: true,
          field: this.field,
          completedAt: new Date().toISOString(),
        });
      }

      if (interimTranscript && this.onResult) {
        this.onResult({
          id: crypto.randomUUID(),
          transcript: interimTranscript,
          confidence: 0,
          isFinal: false,
          field: this.field,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      this.onError?.(event.error || "Recognition error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd?.();
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

/* ── Audio summary (concatenate script to single text) ── */

export function generateAudioSummary(script: NarrationScript): string {
  const lines: string[] = [];
  for (const segment of script.segments) {
    switch (segment.role) {
      case "heading":
        lines.push(segment.text + ".");
        break;
      case "alert":
        lines.push(`Alert: ${segment.text}`);
        break;
      case "instruction":
        lines.push(segment.text);
        break;
      default:
        lines.push(segment.text);
    }
  }
  return lines.join(" ");
}

/* ── Voice preference helpers ── */

export function loadVoiceSettings(): VoiceSettings {
  if (typeof localStorage === "undefined") {
    return { enabled: true, rate: 1, pitch: 1, volume: 0.9, autoNarrate: false, narrateFindings: true, dictationEnabled: true, preferredGender: "any" };
  }
  try {
    const stored = localStorage.getItem("notice-respond-voice-settings");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { enabled: true, rate: 1, pitch: 1, volume: 0.9, autoNarrate: false, narrateFindings: true, dictationEnabled: true, preferredGender: "any" };
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("notice-respond-voice-settings", JSON.stringify(settings));
  } catch {}
}
