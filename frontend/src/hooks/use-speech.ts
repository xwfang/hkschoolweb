import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechOptions {
  rate?: number; // 0.1 - 10
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  lang?: string;
  voice?: SpeechSynthesisVoice | null;
}

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const synthesis = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthesis.current = window.speechSynthesis;

      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      updateVoices();
      
      // Chrome requires this event to load voices
      window.speechSynthesis.onvoiceschanged = updateVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        if (synthesis.current) {
          synthesis.current.cancel();
        }
      };
    }
  }, []);

  const speak = useCallback((text: string, options: SpeechOptions = {}) => {
    if (!synthesis.current) return;

    // Cancel any current speaking
    synthesis.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;
    if (options.voice) utterance.voice = options.voice;
    else if (options.lang) {
      // Try to find a voice that matches the language
      // Prefer Google or Microsoft voices as they tend to be better
      const langVoices = voices.filter(v => v.lang.startsWith(options.lang!));
      if (langVoices.length > 0) {
        // Try to find a "Google" voice first (usually better quality on Android/Chrome)
        const bestVoice = langVoices.find(v => v.name.includes('Google')) || langVoices[0];
        utterance.voice = bestVoice;
      }
    }

    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      setSpeaking(false);
      setPaused(false);
    };

    utteranceRef.current = utterance;
    synthesis.current.speak(utterance);
  }, [voices]);

  const cancel = useCallback(() => {
    if (synthesis.current) {
      synthesis.current.cancel();
      setSpeaking(false);
      setPaused(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (synthesis.current) {
      synthesis.current.pause();
      setPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (synthesis.current) {
      synthesis.current.resume();
      setPaused(false);
    }
  }, []);

  return {
    voices,
    speaking,
    paused,
    speak,
    cancel,
    pause,
    resume
  };
}
