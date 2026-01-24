import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play, Pause, Square, Settings2, Volume2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useSpeech } from "@/hooks/use-speech";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DictationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { voices } = useSpeech();

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  
  // Settings with persistence
  const [rate, setRate] = useState(() => getStoredSetting('rate', 0.8));
  const [pitch, setPitch] = useState(() => getStoredSetting('pitch', 1.0));
  const [repeatCount, setRepeatCount] = useState(() => getStoredSetting('repeatCount', 2));
  const [interval, setInterval] = useState(() => getStoredSetting('interval', 3));
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => localStorage.getItem('dictation_voiceURI') || "");
  const [hideText, setHideText] = useState(true);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('dictation_rate', String(rate));
    localStorage.setItem('dictation_pitch', String(pitch));
    localStorage.setItem('dictation_repeatCount', String(repeatCount));
    localStorage.setItem('dictation_interval', String(interval));
    localStorage.setItem('dictation_voiceURI', selectedVoiceURI);
  }, [rate, pitch, repeatCount, interval, selectedVoiceURI]);

  // Refs for managing playback loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const playQueueRef = useRef<{text: string, index: number, repeatIndex: number}[]>([]);
  
  // Derived state
  const currentItem = items[currentIndex] || "";
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;
  
  // Filter and Sort voices
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
          if (name.includes('google')) score += 10;
          if (name.includes('microsoft')) score += 8;
          if (name.includes('enhanced') || name.includes('premium') || name.includes('high quality')) score += 5;
          if (v.lang.toLowerCase().includes('hk')) score += 2; // Prefer HK voices for this app
          return score;
        };
        return getScore(b) - getScore(a);
      });
  }, [voices]);

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

  const parseText = () => {
    // Replace punctuation with newlines
    const formattedText = text
      .replace(/([.!?。！？;；])/g, "$1\n") // Add newline after punctuation
      .replace(/\n\s*\n/g, "\n"); // Remove empty lines
      
    const lines = formattedText.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    return lines;
  };

  const processQueue = () => {
    if (playQueueRef.current.length === 0) {
      setIsPlaying(false);
      return;
    }

    const nextTask = playQueueRef.current[0];
    setCurrentIndex(nextTask.index);
    setCurrentRepeat(nextTask.repeatIndex);

    const utterance = new SpeechSynthesisUtterance(nextTask.text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      // Finished speaking this item
      // Remove from queue
      playQueueRef.current.shift();
      
      // Wait for interval
      timerRef.current = setTimeout(() => {
        // Check if we should continue (isPlaying might have been set to false by stop)
        // Accessing state inside timeout is tricky, but playQueueRef is mutable.
        // If queue was cleared, we stop.
        if (playQueueRef.current.length > 0) {
           processQueue();
        } else {
           setIsPlaying(false);
        }
      }, interval * 1000);
    };

    utterance.onerror = (e) => {
        console.error("Speech error", e);
        // Skip on error
        playQueueRef.current.shift();
        processQueue();
    }

    window.speechSynthesis.speak(utterance);
  };
  
  const startPlayback = () => {
    const parsedItems = parseText();
    if (parsedItems.length === 0) return;

    setItems(parsedItems);
    setIsPlaying(true);
    setIsPaused(false);
    
    // Ensure audio context is unlocked for mobile
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume(); 
    
    // Build Queue
    const queue: {text: string, index: number, repeatIndex: number}[] = [];
    parsedItems.forEach((item, idx) => {
        for (let r = 0; r < repeatCount; r++) {
            queue.push({ text: item, index: idx, repeatIndex: r + 1 });
        }
    });
    
    playQueueRef.current = queue;
    
    // Process immediately without timeout to satisfy mobile user interaction requirements
    processQueue();
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    playQueueRef.current = [];
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const pausePlayback = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  const resumePlayback = () => {
      window.speechSynthesis.resume();
      setIsPaused(false);
      if (!window.speechSynthesis.speaking && playQueueRef.current.length > 0) {
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
            <CardHeader>
              <CardTitle className="text-base">{t('dictation.input_label', '请输入听写内容')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder={t('dictation.placeholder', '粘贴单词或句子，每行一个...')}
                className="min-h-[200px] text-lg"
                value={text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              />
              <p className="text-xs text-gray-500 text-right">
                {text.length}/300
              </p>
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

            <div className="flex items-center gap-6">
               {/* Controls */}
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-12 w-12 rounded-full"
                 onClick={() => {
                   stopPlayback();
                 }}
               >
                 <Square className="h-5 w-5 fill-gray-600 text-gray-600" />
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
                 onClick={() => setHideText(!hideText)}
               >
                 {hideText ? "👁️" : "🙈"}
               </Button>
            </div>
          </div>
        )}

        {/* Settings Area */}
        <Card>
          <CardHeader className="pb-3">
             <CardTitle className="text-base flex items-center gap-2">
               <Settings2 className="w-4 h-4" />
               {t('dictation.settings', '设置')}
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
               <Select 
                 value={selectedVoiceURI} 
                 onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedVoiceURI(e.target.value)}
               >
                 <option value="" disabled>
                   {t('dictation.select_voice', '选择语音')}
                 </option>
                 {sortedVoices.map((voice) => (
                   <option key={voice.voiceURI} value={voice.voiceURI}>
                     {voice.name} ({voice.lang})
                   </option>
                 ))}
               </Select>
             </div>

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
