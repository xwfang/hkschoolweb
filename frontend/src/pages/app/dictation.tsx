import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play, Pause, Square, Volume2, Info, RefreshCw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useSpeech } from "@/hooks/use-speech";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Extend Window interface to prevent GC
declare global {
  interface Window {
    _speechUtterances: SpeechSynthesisUtterance[];
  }
}

export default function DictationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { voices, refreshVoices } = useSpeech();

  // Load settings from localStorage or defaults
  const getStoredSetting = (key: string, defaultVal: number): number => {
    const stored = localStorage.getItem(`dictation_${key}`);
    if (stored === null) return defaultVal;
    const num = Number(stored);
    return isNaN(num) ? defaultVal : num;
  };

  // State
  const [text, setText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  
  // Settings with persistence
  const [rate, setRate] = useState(() => getStoredSetting('rate', 0.8));
  const [pitch, setPitch] = useState(() => getStoredSetting('pitch', 1.0));
  const [repeatCount, setRepeatCount] = useState(() => getStoredSetting('repeatCount', 2));
  const [interval, setInterval] = useState(() => getStoredSetting('interval', 3));
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => localStorage.getItem('dictation_voiceURI') || "");
  const [hideText, setHideText] = useState(true);
  const [splitBySpace, setSplitBySpace] = useState(() => localStorage.getItem('dictation_splitBySpace') === 'true');
  const [useSmartSplit, setUseSmartSplit] = useState(() => localStorage.getItem('dictation_useSmartSplit') !== 'false'); // Default true
  const [maxChunkLength, setMaxChunkLength] = useState(() => getStoredSetting('maxChunkLength', 15));

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('dictation_rate', String(rate));
    localStorage.setItem('dictation_pitch', String(pitch));
    localStorage.setItem('dictation_repeatCount', String(repeatCount));
    localStorage.setItem('dictation_interval', String(interval));
    localStorage.setItem('dictation_voiceURI', selectedVoiceURI);
    localStorage.setItem('dictation_splitBySpace', String(splitBySpace));
    localStorage.setItem('dictation_useSmartSplit', String(useSmartSplit));
    localStorage.setItem('dictation_maxChunkLength', String(maxChunkLength));
  }, [rate, pitch, repeatCount, interval, selectedVoiceURI, splitBySpace, useSmartSplit, maxChunkLength]);

  // Refs for managing playback loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const playQueueRef = useRef<{text: string, index: number, repeatIndex: number}[]>([]);
  const queueIndexRef = useRef(0);
  // We use a window-level array to hold utterances to prevent GC on Android
  // currentUtteranceRef is kept for compatibility but the real protection is window._speechUtterances
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Extend Window interface to hold utterances
  useEffect(() => {
    if (!window._speechUtterances) {
      window._speechUtterances = [];
    }
    return () => {
      // Cleanup on unmount
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      window._speechUtterances = [];
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // Derived state
  const currentItem = items[currentIndex] || "";
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;
  
  // Periodically check for voices if they are empty (fix for some Android devices)
  // Note: We also improved useSpeech hook to do polling, but keeping a listener here just in case doesn't hurt,
  // although it's better to rely on the hook.
  // We'll remove the interval here since we moved logic to useSpeech.
  
  const getLanguageLabel = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('hk') || l.includes('cantonese')) return '🇭🇰 粤语 (Cantonese)';
    if (l.includes('tw')) return '🇹🇼 国语 (Taiwan)';
    if (l.includes('cn') || (l.includes('zh') && !l.includes('hk') && !l.includes('tw'))) return '🇨🇳 普通话 (Mandarin)';
    if (l.includes('en')) return '🇺🇸/🇬🇧 英语 (English)';
    return lang;
  };

  const sortedVoices = useMemo(() => {
    return voices
      .filter(voice => {
        const lang = voice.lang.toLowerCase();
        return lang.includes('zh') || // Chinese (Generic)
               lang.includes('cn') || // Mainland China (Simplified)
               lang.includes('hk') || // Hong Kong (Traditional)
               lang.includes('tw') || // Taiwan (Traditional)
               lang.includes('en');   // English (Generic)
      })
      .sort((a, b) => {
        // Scoring system for sorting
        const getScore = (v: SpeechSynthesisVoice) => {
          let score = 0;
          const name = v.name.toLowerCase();
          // Google voices are preferred for Chrome
          if (name.includes('google')) score += 20;
          if (name.includes('microsoft')) score += 15;
          if (name.includes('enhanced') || name.includes('premium') || name.includes('high quality')) score += 10;
          if (v.lang.toLowerCase().includes('hk')) score += 5; // Prefer HK voices for this app
          if (v.default) score += 2;
          return score;
        };
        return getScore(b) - getScore(a);
      });
  }, [voices]);

  // Auto-select the best voice if none is selected or current selection is invalid
  useEffect(() => {
    if (sortedVoices.length > 0) {
      const currentVoiceExists = sortedVoices.some(v => v.voiceURI === selectedVoiceURI);
      if (!selectedVoiceURI || !currentVoiceExists) {
        // Default to the first voice (highest score)
        // Since we heavily weight Google voices, this ensures Google is default on Chrome
        const defaultVoice = sortedVoices[0].voiceURI;
        setTimeout(() => setSelectedVoiceURI(defaultVoice), 0);
      }
    }
  }, [sortedVoices, selectedVoiceURI]);

  // Initialize voice
  useEffect(() => {
    // Only set default if no voice is selected or the selected voice is no longer available
    const currentVoiceExists = voices.find(v => v.voiceURI === selectedVoiceURI);
    
    if (sortedVoices.length > 0 && (!selectedVoiceURI || !currentVoiceExists)) {
      // Try to find a Cantonese/HK voice first for "HK School" context, then Mandarin, then English
      const hkVoice = sortedVoices.find(v => v.lang.toLowerCase().includes('hk') || v.lang.toLowerCase().includes('cantonese'));
      const cnVoice = sortedVoices.find(v => v.lang.toLowerCase().includes('zh') || v.lang.toLowerCase().includes('cn'));
      
      const targetVoice = hkVoice || cnVoice || sortedVoices[0];
      if (targetVoice) {
         // Use setTimeout to avoid set state during render warning
         setTimeout(() => setSelectedVoiceURI(targetVoice.voiceURI), 0);
      }
    }
  }, [voices, sortedVoices, selectedVoiceURI]);

  const smartSplitText = (text: string, maxLen: number) => {
    // Basic browser support check for Intl.Segmenter
    // @ts-expect-error Intl.Segmenter might not be in TS lib
    if (typeof Intl === 'undefined' || !Intl.Segmenter) {
      return [text];
    }

    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    // Use the voice's language, or fallback to zh-CN. 
    // Intl.Segmenter handles most BCP 47 tags correctly.
    const locale = voice?.lang || 'zh-CN';

    // @ts-expect-error Intl.Segmenter might not be in TS lib
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    const segments = segmenter.segment(text);
    const result: string[] = [];
    let currentChunk = "";

    for (const { segment } of segments) {
       if (currentChunk.length + segment.length > maxLen && currentChunk.length > 0) {
           result.push(currentChunk);
           currentChunk = "";
       }
       currentChunk += segment;
    }
    if (currentChunk.length > 0) {
        result.push(currentChunk);
    }
    return result;
  };

  const parseText = () => {
    let formattedText = text;
    
    // 1. First handle paired punctuation - protect them from being split
    // Replace opening brackets with temporary placeholders if needed, 
    // but here we just want to ensure we don't split AFTER an opening bracket.
    // Actually, the previous logic was splitting after ANY of these characters.
    // We should ONLY split after CLOSING brackets or sentence-ending punctuation.

    // 2. Define splitting rules
     // 2. Define splitting rules
     // Rule 1: Split after sentence enders and closing brackets
     // Split after: . ! ? ; , : 。 ！？ ； ， ： 、 … —
     // AND Split after closing brackets: 」 』 ） 】 ) 》 ” ’ ] }
     // BUT we use a negative lookahead (?![...]) to ensure we DON'T split if the NEXT character is also a punctuation mark
     // This prevents splitting "Hello!?" into "Hello!" and "?"
     formattedText = formattedText
        .replace(/([.!?。！？;；,，：、…—」』）】)》”’\]}]+)(?![.!?。！？;；,，：、…—」』）】)》”’\]}])/g, "$1\n"); 

     // Rule 2: Split BEFORE opening brackets (so they start a new line)
     // Split before: 「 『 （ 【 ( 《 “ ‘ [ {
     // We use a positive lookahead to find the opening bracket and insert a newline before it
     // But we need to be careful not to create double newlines if there was already a split
     formattedText = formattedText
        .replace(/([「『（【(《“‘[{])/g, "\n$1");

     // Cleanup: Remove multiple newlines created by overlapping rules
     formattedText = formattedText.replace(/\n+/g, "\n");
      
    let lines: string[] = [];
    
    if (splitBySpace) {
      // Split by newlines and spaces
      lines = formattedText.split(/[\n\s]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
      // Split by newlines only (punctuation already converted to newlines)
      lines = formattedText.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Apply smart splitting if enabled
      if (useSmartSplit) {
        lines = lines.flatMap(line => smartSplitText(line, maxChunkLength));
      }
    }
      
    return lines;
  };

  const processQueue = () => {
    // Clear previous watchdog
    if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
    }

    if (queueIndexRef.current >= playQueueRef.current.length) {
      setIsPlaying(false);
      return;
    }

    const nextTask = playQueueRef.current[queueIndexRef.current];
    setCurrentIndex(nextTask.index);
    setCurrentRepeat(nextTask.repeatIndex);

    const utterance = new SpeechSynthesisUtterance(nextTask.text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) utterance.voice = voice;

    // Add to global array to prevent garbage collection on Android
    window._speechUtterances.push(utterance);
    currentUtteranceRef.current = utterance;

    const cleanup = () => {
        const index = window._speechUtterances.indexOf(utterance);
        if (index > -1) {
            window._speechUtterances.splice(index, 1);
        }
        if (watchdogRef.current) {
            clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
        }
    };

    const handleEnd = (fromWatchdog = false) => {
      // Prevent double handling
      if (!currentUtteranceRef.current) return;

      // If paused, just cleanup and return. 
      // Do not advance queue or set timers.
      if (isPausedRef.current) {
          cleanup();
          currentUtteranceRef.current = null;
          return;
      }

      cleanup();
      // Finished speaking this item
      currentUtteranceRef.current = null;
      
      // Move to next item
      queueIndexRef.current++;
      
      // Check if we reached the end
      if (queueIndexRef.current >= playQueueRef.current.length) {
         setIsPlaying(false);
         return;
      }

      // Wait for interval
      // If triggered by watchdog, we've already waited a long time, so reduce the interval
      const waitTime = fromWatchdog ? 500 : (interval * 1000);

      timerRef.current = setTimeout(() => {
        // Check if we should continue (isPlaying might have been set to false by stop)
        if (queueIndexRef.current < playQueueRef.current.length) {
           processQueue();
        } else {
           setIsPlaying(false);
        }
      }, waitTime);
    };

    utterance.onend = () => handleEnd(false);

    utterance.onerror = (e) => {
        console.error("Speech error", e);
        cleanup();
        // Skip on error but wait a bit
        queueIndexRef.current++;
        setTimeout(processQueue, 500);
    }

    // Watchdog: If onend doesn't fire within expected time + buffer, force next
    // Estimate duration: 1 char ~ 500ms (generous) + 3s buffer
    // Minimum 5 seconds
    const estimatedDuration = Math.max((nextTask.text.length * 500) + 3000, 5000);
    watchdogRef.current = setTimeout(() => {
        console.warn("Speech watchdog triggered - forcing next item");
        window.speechSynthesis.cancel(); // Force stop current
        handleEnd(true);
    }, estimatedDuration);

    window.speechSynthesis.speak(utterance);
  };
  
  const startPlayback = () => {
    const parsedItems = parseText();
    if (parsedItems.length === 0) return;

    setItems(parsedItems);
    setIsPlaying(true);
    setIsPaused(false);
    isPausedRef.current = false;
    
    // Ensure audio context is unlocked for mobile
    window.speechSynthesis.cancel();
    
    // Force voice loading on Android if empty and wake up engine
    // Some Android devices need this "warm up"
    const wakeUp = new SpeechSynthesisUtterance('');
    wakeUp.volume = 0; // Silent
    window.speechSynthesis.speak(wakeUp);
    
    if (voices.length === 0) {
      window.speechSynthesis.getVoices();
    }
    
    // Build Queue
    const queue: {text: string, index: number, repeatIndex: number}[] = [];
    parsedItems.forEach((item, idx) => {
        for (let r = 0; r < repeatCount; r++) {
            queue.push({ text: item, index: idx, repeatIndex: r + 1 });
        }
    });
    
    playQueueRef.current = queue;
    queueIndexRef.current = 0;
    
    // Process immediately without timeout to satisfy mobile user interaction requirements
    processQueue();
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setIsPaused(false);
    isPausedRef.current = false;
    window.speechSynthesis.cancel();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
    }
    playQueueRef.current = [];
    queueIndexRef.current = 0;
    currentUtteranceRef.current = null;
    // Clear global utterances
    window._speechUtterances = [];
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const pausePlayback = () => {
    // Use cancel() instead of pause() for better reliability across browsers
    window.speechSynthesis.cancel();
    setIsPaused(true);
    isPausedRef.current = true;
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
    if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
    }
  };

  const resumePlayback = () => {
      // Use processQueue() instead of resume() to restart the current item fresh
      // This avoids bugs where resume() fails to speak or gets stuck
      setIsPaused(false);
      isPausedRef.current = false;
      processQueue();
  };

  const skipToNext = () => {
    const currentTask = playQueueRef.current[queueIndexRef.current];
    if (!currentTask) return;
    
    const currentSentenceIdx = currentTask.index;
    const nextTaskIndex = playQueueRef.current.findIndex(t => t.index > currentSentenceIdx);
    
    if (nextTaskIndex !== -1) {
       window.speechSynthesis.cancel();
       if (timerRef.current) clearTimeout(timerRef.current);
       if (watchdogRef.current) clearTimeout(watchdogRef.current);
       queueIndexRef.current = nextTaskIndex;
       setIsPaused(false);
       isPausedRef.current = false;
       processQueue();
    }
  };
  
  const skipToPrevious = () => {
    const currentTask = playQueueRef.current[queueIndexRef.current];
    if (!currentTask) return;
    
    const currentSentenceIdx = currentTask.index;
    if (currentSentenceIdx === 0) {
       window.speechSynthesis.cancel();
       if (timerRef.current) clearTimeout(timerRef.current);
       if (watchdogRef.current) clearTimeout(watchdogRef.current);
       queueIndexRef.current = 0;
       setIsPaused(false);
       isPausedRef.current = false;
       processQueue();
       return;
    }
    
    const prevTaskIndex = playQueueRef.current.findIndex(t => t.index === currentSentenceIdx - 1);
    if (prevTaskIndex !== -1) {
       window.speechSynthesis.cancel();
       if (timerRef.current) clearTimeout(timerRef.current);
       if (watchdogRef.current) clearTimeout(watchdogRef.current);
       queueIndexRef.current = prevTaskIndex;
       setIsPaused(false);
       isPausedRef.current = false;
       processQueue();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{t('dictation.title', '听写助手')}</h1>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
        
        {/* Input Area - Only show when not playing */}
        {!isPlaying && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Textarea 
                placeholder={t('dictation.placeholder', '请输入听写内容...')}
                className="min-h-[200px] text-lg"
                value={text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              />
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="split-by-space" 
                      checked={splitBySpace} 
                      onCheckedChange={setSplitBySpace} 
                    />
                    <Label htmlFor="split-by-space">{t('dictation.split_by_space', '按空格分割单词')}</Label>
                  </div>
                  <p className="text-xs text-gray-500 text-right">
                    {text.length}/300
                  </p>
                </div>
                
                {!splitBySpace && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center space-x-2">
                       <Switch id="smart-split" checked={useSmartSplit} onCheckedChange={setUseSmartSplit} />
                       <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="smart-split">{t('dictation.smart_split', '智能分段')}</Label>
                          <p className="text-xs text-muted-foreground">{t('dictation.smart_split_desc', '自动拆分长难句')}</p>
                       </div>
                    </div>
                    
                    {useSmartSplit && (
                       <div className="flex items-center space-x-2 w-1/2">
                          <Label className="text-xs whitespace-nowrap">{t('dictation.max_chars', '每句最大字数')}: {maxChunkLength}</Label>
                          <Slider 
                             value={[maxChunkLength]} 
                             min={5} 
                             max={50} 
                             step={1} 
                             onValueChange={(vals) => setMaxChunkLength(vals[0])} 
                             className="flex-1"
                          />
                       </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Playback Area - Only show when playing */}
        {isPlaying && (
          <div className="flex flex-col items-center justify-center py-10 space-y-8">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-widest">
                {t('dictation.progress', '进度')} {currentIndex + 1} / {items.length}
              </p>
              <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <Card className="w-full max-w-md border-2 border-indigo-100 shadow-lg">
              <CardContent className="flex items-center justify-center min-h-[200px] p-8 relative">
                {hideText ? (
                  <div className="text-center">
                    <Volume2 className="w-16 h-16 text-indigo-200 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-400 font-medium">{t('dictation.listening', '正在朗读...')}</p>
                  </div>
                ) : (
                  <h2 className="text-3xl font-bold text-center text-gray-900 break-words">
                    {currentItem}
                  </h2>
                )}
                
                <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-mono">
                   {currentRepeat}/{repeatCount}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4">
               {/* Controls */}
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-10 w-10 rounded-full"
                 onClick={stopPlayback}
               >
                 <Square className="h-4 w-4 fill-gray-600 text-gray-600" />
               </Button>

               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-12 w-12 rounded-full"
                 onClick={skipToPrevious}
               >
                 <SkipBack className="h-5 w-5 text-gray-700" />
               </Button>

               <Button 
                 variant="default" 
                 size="icon" 
                 className="h-16 w-16 rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700"
                 onClick={() => {
                   if (isPaused) {
                     resumePlayback();
                   } else if (isPlaying) {
                     pausePlayback();
                   }
                 }}
               >
                 {isPaused ? (
                   <Play className="h-8 w-8 ml-1" />
                 ) : (
                   <Pause className="h-8 w-8" />
                 )}
               </Button>

               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-12 w-12 rounded-full"
                 onClick={skipToNext}
               >
                 <SkipForward className="h-5 w-5 text-gray-700" />
               </Button>

               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-10 w-10 rounded-full"
                 onClick={() => setHideText(!hideText)}
               >
                 {hideText ? "👁️" : "🙈"}
               </Button>
            </div>
          </div>
        )}

        {/* Settings Area */}
        <Card>
          <CardContent className="space-y-6 pt-6">
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <Label>{t('dictation.voice', '语音')}</Label>
                 <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center text-xs text-blue-500 cursor-help gap-1">
                          <Info className="w-3 h-3" />
                          <span>如何提升音质?</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>Web版听写使用的是浏览器和操作系统自带的语音引擎。</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li><strong>Chrome用户</strong>: 推荐使用名称包含 "Google" 的语音。</li>
                          <li><strong>Mac用户</strong>: 在 系统设置-辅助功能-朗读内容-系统语音 中下载 "Enhanced/增强" 语音包。</li>
                          <li><strong>Windows用户</strong>: 在 设置-时间和语言-语音 中添加更多语音。</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
               </div>
               <div className="flex gap-2">
               <select 
                 className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 value={selectedVoiceURI} 
                 onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedVoiceURI(e.target.value)}
                 onClick={refreshVoices}
               >
                 <option value="" disabled>
                   {sortedVoices.length === 0 ? t('dictation.loading_voices', '点击加载语音...') : t('dictation.select_voice', '选择语音')}
                 </option>
                 {sortedVoices.map((voice) => (
                   <option key={voice.voiceURI} value={voice.voiceURI}>
                     {getLanguageLabel(voice.lang)} - {voice.name}
                   </option>
                 ))}
               </select>
               <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    // Force refresh voices
                    refreshVoices();
                    // Also try to speak empty string to wake up engine on Android
                    window.speechSynthesis.cancel();
                  }}
                  title="Reload Voices"
               >
                  <RefreshCw className="h-4 w-4" />
               </Button>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
               <div className="space-y-4">
                 <div className="flex justify-between">
                   <Label>{t('dictation.rate', '语速')}: {rate}x</Label>
                 </div>
                 <Slider 
                   value={[rate]} 
                   min={0.5} 
                   max={2} 
                   step={0.1} 
                   onValueChange={([v]: number[]) => setRate(v)} 
                 />
               </div>

               <div className="space-y-4">
                 <div className="flex justify-between">
                   <Label>{t('dictation.pitch', '语调')}: {pitch}</Label>
                 </div>
                 <Slider 
                   value={[pitch]} 
                   min={0.5} 
                   max={2} 
                   step={0.1} 
                   onValueChange={([v]: number[]) => setPitch(v)} 
                 />
               </div>

               <div className="space-y-4">
                 <div className="flex justify-between">
                   <Label>{t('dictation.interval', '间隔时间')}: {interval}s</Label>
                 </div>
                 <Slider 
                   value={[interval]} 
                   min={1} 
                   max={10} 
                   step={1} 
                   onValueChange={([v]: number[]) => setInterval(v)} 
                 />
               </div>

               <div className="space-y-4">
                 <div className="flex justify-between">
                   <Label>{t('dictation.repeat', '重复次数')}: {repeatCount}</Label>
                 </div>
                 <Slider 
                   value={[repeatCount]} 
                   min={1} 
                   max={5} 
                   step={1} 
                   onValueChange={([v]: number[]) => setRepeatCount(v)} 
                 />
               </div>
             </div>
          </CardContent>
        </Card>

        {!isPlaying && (
          <Button 
            className="w-full h-12 text-lg font-bold shadow-md"
            onClick={startPlayback}
            disabled={!text.trim()}
          >
            <Play className="w-5 h-5 mr-2" />
            {t('dictation.start', '开始听写')}
          </Button>
        )}
      </div>
    </div>
  );
}
