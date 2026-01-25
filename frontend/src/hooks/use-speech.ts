import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
  const refreshingVoicesRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
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
        // First, try to get voices directly
        let vs = window.speechSynthesis.getVoices();
        
        if (vs.length > 0) {
            setVoices(vs);
            refreshingVoicesRef.current = false;
            // Clear any existing poll interval
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        } else if (!refreshingVoicesRef.current) {
            // Only start refresh if not already refreshing
            refreshingVoicesRef.current = true;
            
            // Android hack: wake up the engine by speaking an empty, silent utterance
            // This is necessary because Android Chrome doesn't load voices until the engine is "woken up"
            const wakeUpUtterance = new SpeechSynthesisUtterance('');
            wakeUpUtterance.volume = 0; // Silent
            
            const finishRefresh = () => {
                refreshingVoicesRef.current = false;
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            };
            
            wakeUpUtterance.onstart = () => {
                // Cancel immediately after starting (it's silent anyway)
                window.speechSynthesis.cancel();
            };
            wakeUpUtterance.onend = () => {
                // After the engine is woken up, get voices again
                setTimeout(() => {
                    vs = window.speechSynthesis.getVoices();
                    if (vs.length > 0) {
                        setVoices(vs);
                        finishRefresh();
                    }
                }, 100);
            };
            wakeUpUtterance.onerror = () => {
                // Even on error, try to get voices
                setTimeout(() => {
                    vs = window.speechSynthesis.getVoices();
                    if (vs.length > 0) {
                        setVoices(vs);
                        finishRefresh();
                    }
                }, 100);
            };
            
            // Cancel any ongoing speech first
            window.speechSynthesis.cancel();
            // Speak the wake-up utterance
            window.speechSynthesis.speak(wakeUpUtterance);
            
            // Also try polling as a fallback
            let pollCount = 0;
            // Clear any existing poll interval
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
            pollIntervalRef.current = setInterval(() => {
                pollCount++;
                vs = window.speechSynthesis.getVoices();
                if (vs.length > 0) {
                    setVoices(vs);
                    finishRefresh();
                } else if (pollCount >= 10) {
                    // Stop polling after 5 seconds (10 * 500ms)
                    finishRefresh();
                }
            }, 500);
        }
    }
  }, []);

  const sortedVoices = useMemo(() => {
    // Known macOS/iOS novelty/sound-effect voices to exclude
    const EXCLUDED_VOICES = [
      "Agnes", "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bruce", "Bubbles", 
      "Cellos", "Deranged", "Fred", "Good News", "Hysterical", "Junior", "Kathy", 
      "Pipe Organ", "Princess", "Ralph", "Trinoids", "Vicki", "Victoria", "Whisper", 
      "Zarvox", "Organ", "Jester", "Superstar", "Wobble",
      // Character voices
      "Grandma", "Grandpa", "Eddy", "Flo", "Reed", "Rocko", "Sandy", "Shelley"
    ];

    return voices
      .filter(voice => {
        const lang = voice.lang.toLowerCase();
        const name = voice.name;
        
        // Filter by language
        const isLangMatch = lang.includes('zh') || // Chinese (Generic)
               lang.includes('cn') || // Mainland China (Simplified)
               lang.includes('hk') || // Hong Kong (Traditional)
               lang.includes('tw') || // Taiwan (Traditional)
               lang.includes('en');   // English (Generic)
               
        // Filter out novelty voices
        const isExcluded = EXCLUDED_VOICES.some(excluded => name.includes(excluded));
        
        return isLangMatch && !isExcluded;
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
  }, [voices]);

  return {
    voices: sortedVoices,
    speaking,
    paused,
    speak,
    cancel,
    pause,
    resume,
    refreshVoices
  };
}
