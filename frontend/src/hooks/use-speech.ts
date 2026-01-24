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
      
      // Fallback: poll for voices if they are not loaded yet (common issue on Android Chrome)
      const intervalId = setInterval(() => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoices(voices);
          // Don't clear interval immediately, keep checking for a bit in case more voices load
          // But actually, getVoices returns the current list.
        }
      }, 500);

      // Stop polling after 5 seconds to avoid performance impact
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
      }, 5000);

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
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

  const refreshVoices = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const vs = window.speechSynthesis.getVoices();
        if (vs.length > 0) {
            setVoices(vs);
        } else {
             // Android hack: sometimes we need to speak to wake up the engine
             // But we don't want to do this automatically too often as it might impact UX
             // Just trigger getVoices again
             window.speechSynthesis.getVoices();
        }
    }
  }, []);

  return {
    voices,
    speaking,
    paused,
    speak,
    cancel,
    pause,
    resume,
    refreshVoices
  };
}
