import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi } from "@/api/ai";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "您好！我是您的升学助手。您可以问我任何关于香港学校申请的问题，例如：“九龙城有哪些 Band 1 男校？” 或 “如何准备直资中学的面试？”"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const QUICK_ACTIONS = [
    { label: "写自荐信", icon: "📝", prompt: "请帮我为 [孩子姓名] 写一封申请 [目标学校] 的自荐信，突出 [特长]..." },
    { label: "面试模拟", icon: "🎤", prompt: "我要准备直资中学的面试，请扮演面试官向我提问。" },
    { label: "简历分析", icon: "📊", prompt: "请分析我孩子的简历优势和劣势：[粘贴简历内容]" },
  ];

  const chatMutation = useMutation({
    mutationFn: aiApi.chat,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response
        }
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "抱歉，我遇到了一些问题，请稍后再试。"
        }
      ]);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputValue;
    
    if (!textToSend.trim() || chatMutation.isPending) return;

    const currentId = Date.now().toString();

    const userMsg: Message = {
      id: currentId,
      role: "user",
      content: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    chatMutation.mutate(userMsg.content);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 h-14 flex items-center gap-2 sticky top-0 z-10 shadow-sm">
        <div className="bg-indigo-100 p-1.5 rounded-full">
          <Bot className="h-5 w-5 text-indigo-600" />
        </div>
        <h1 className="font-semibold text-lg">AI助手</h1>
        <div className="ml-auto">
          <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex w-full gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
            )}
            
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-white text-gray-800 border rounded-tl-none"
              )}
            >
              {msg.content}
            </div>

            {msg.role === "user" && (
              <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mt-1">
                <User className="h-5 w-5 text-gray-500" />
              </div>
            )}
          </div>
        ))}
        
        {chatMutation.isPending && (
          <div className="flex w-full gap-3 justify-start">
            <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
              <Bot className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="bg-white border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (Only show when no messages or only welcome message) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(undefined, action.prompt)}
              className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t p-3 safe-area-pb">
        <form onSubmit={(e) => handleSend(e)} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="问问 AI..."
            className="flex-1 bg-gray-50 focus:bg-white"
            disabled={chatMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
            disabled={!inputValue.trim() || chatMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
