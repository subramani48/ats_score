'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

// The Web Speech API is not in TypeScript's DOM lib, so declare the small surface we use.
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/**
 * Push-to-talk dictation. `onFinalText` receives each finished phrase.
 * `speakingSeconds` counts time spent listening, used for words-per-minute.
 */
export function useSpeechRecognition(onFinalText: (text: string) => void, lang = 'en-US') {
  // Whether the browser can do speech recognition never changes, so there is nothing to subscribe to.
  const supported = useSyncExternalStore(() => () => {}, () => !!getCtor(), () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [speakingSeconds, setSpeakingSeconds] = useState(0);

  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const startedAt = useRef(0);
  const cb = useRef(onFinalText);

  useEffect(() => { cb.current = onFinalText; }, [onFinalText]);

  const bankTime = () => {
    if (startedAt.current) {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      startedAt.current = 0;
      setSpeakingSeconds(s => s + elapsed);
    }
  };

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || wantRef.current) return;
    setError('');
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = e => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) cb.current(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      wantRef.current = false;
      setError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech error: ${e.error}`);
    };
    rec.onend = () => {
      // Browsers stop after silence; restart while the user still wants to talk.
      if (wantRef.current) {
        try { rec.start(); return; } catch { wantRef.current = false; }
      }
      bankTime();
      setInterim('');
      setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    startedAt.current = Date.now();
    rec.start();
    setListening(true);
  }, [lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
  }, []);

  const resetTimer = useCallback(() => setSpeakingSeconds(0), []);

  useEffect(() => () => { wantRef.current = false; recRef.current?.stop(); }, []);

  return { supported, listening, interim, error, speakingSeconds, start, stop, resetTimer };
}
