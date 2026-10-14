"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, UserCheck, MessageCircle, Edit2, Sparkles } from "lucide-react";
import axios from "axios";
import { HTTP_BACKEND } from "@/app/config";

interface ChatMessage {
  id?: string;
  senderName: string;
  message: string;
  timestamp: string;
  isSelf: boolean;
}

export function ChatOverlay({
  socket,
  roomId,
  userEmail,
  isOpen,
  onToggle
}: {
  socket: WebSocket | null;
  roomId: string;
  userEmail: string;
  isLoggedIn?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  
  // User name state
  const [chatUserName, setChatUserName] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize display name on mount (sessionStorage allows each tab to have a unique chat identity)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionName = sessionStorage.getItem("chatUserName");
      const localName = localStorage.getItem("chatUserName");
      const storedEmail = localStorage.getItem("userEmail");
      
      if (sessionName && sessionName.trim()) {
        setChatUserName(sessionName.trim());
      } else if (localName && localName.trim()) {
        setChatUserName(localName.trim());
        sessionStorage.setItem("chatUserName", localName.trim());
      } else if (storedEmail && storedEmail !== "dev-user@example.com") {
        const clean = storedEmail.includes("@") ? storedEmail.split("@")[0]! : storedEmail;
        setChatUserName(clean);
        sessionStorage.setItem("chatUserName", clean);
      }
    }
  }, []);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem("chatUserName", trimmed);
    localStorage.setItem("chatUserName", trimmed);
    setChatUserName(trimmed);
    setIsEditingName(false);
    setNameInput("");
  };

  // Active display name
  const activeMyName: string = chatUserName || (userEmail && userEmail !== "dev-user@example.com" ? (userEmail.includes("@") ? userEmail.split("@")[0]! : userEmail) : "");

// Helper to extract message text, senderName, and determine if it's a shape
function parseDbMessage(raw: string, fallbackSender: string): { isShape: boolean; text: string; senderName: string } {
  if (!raw || typeof raw !== "string") {
    return { isShape: false, text: "", senderName: fallbackSender };
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        if (parsed.type === "chat_text") {
          return {
            isShape: false,
            text: parsed.text || "",
            senderName: parsed.senderName || fallbackSender
          };
        }
        const shapeTypes = ["rect", "circle", "arrow", "triangle", "pencil", "text", "eraser"];
        if (shapeTypes.includes(parsed.type)) {
          return { isShape: true, text: "", senderName: "" };
        }
      }
    } catch (e) {
      // not valid JSON, treat as regular text
    }
  }
  return {
    isShape: false,
    text: raw,
    senderName: fallbackSender
  };
}

function getResolvedHttpBackend(): string {
  let url = HTTP_BACKEND || "http://localhost:3002";
  if (typeof window !== "undefined" && url.includes("localhost") && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    url = url.replace("localhost", window.location.hostname);
  }
  return url;
}

  // Fetch initial chat history from backend on mount
  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const response = await axios.get(`${getResolvedHttpBackend()}/chats/${roomId}`);
        if (active && Array.isArray(response.data?.messages)) {
          const loaded: ChatMessage[] = [];
          for (const m of response.data.messages) {
            const rawSender = m.user?.name || (m.user?.email ? m.user.email.split("@")[0]! : "Member");
            const cleanFallback = rawSender.includes("@") ? rawSender.split("@")[0]! : rawSender;
            const parsed = parseDbMessage(m.message, cleanFallback);
            if (parsed.isShape) continue; // Skip all canvas shapes

            const finalSender = parsed.senderName || cleanFallback;
            const isMe = activeMyName ? (finalSender.trim().toLowerCase() === activeMyName.trim().toLowerCase()) : false;

            loaded.push({
              id: String(m.id || Math.random()),
              senderName: finalSender,
              message: parsed.text,
              timestamp: m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isSelf: isMe
            });
          }
          setMessages(loaded);
        }
      } catch (err) {
        // Silently catch if chat history route is unavailable
      }
    }
    fetchHistory();
    return () => { active = false; };
  }, [roomId, userEmail, activeMyName]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && activeMyName) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, activeMyName]);



  // Listen to WebSocket user_text_message events
  useEffect(() => {
    if (!socket) return;

    const handleSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "user_text_message") {
          const parsed = parseDbMessage(data.message, data.senderName || "Member");
          if (parsed.isShape) return;

          const finalSender = data.senderName || parsed.senderName || "Member";
          const finalText = parsed.text || data.message;
          const isMe = activeMyName ? (finalSender.trim().toLowerCase() === activeMyName.trim().toLowerCase()) : false;

          const newMsg: ChatMessage = {
            id: String(Math.random()),
            senderName: finalSender,
            message: finalText,
            timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            isSelf: isMe
          };

          setMessages((prev) => [...prev, newMsg]);
        }
      } catch (e) {
        // Non-JSON or different event type
      }
    };

    socket.addEventListener("message", handleSocketMessage);
    return () => {
      socket.removeEventListener("message", handleSocketMessage);
    };
  }, [socket, isOpen, userEmail, activeMyName]);

  const sendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !socket || socket.readyState !== WebSocket.OPEN || !activeMyName) return;

    const payload = {
      type: "user_text_message",
      roomId,
      message: trimmed,
      senderName: activeMyName
    };

    socket.send(JSON.stringify(payload));
    setInputText("");
  };

  return (
    <>
      {/* 1. Name Setup Prompt if user hasn't set their name yet or is editing name */}
      {isOpen && (!activeMyName || isEditingName) && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 bottom-20 sm:bottom-24 z-50 w-[calc(100vw-1rem)] sm:w-96 max-w-[420px] rounded-2xl sm:rounded-3xl bg-zinc-950/95 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-6 duration-200">
          {/* Panel Header */}
          <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <UserCheck size={15} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isEditingName ? "Change Your Name" : "Join Live Chat"}
                </h3>
                <p className="text-[9px] text-indigo-400/80 font-medium">Collaborating in Room #{roomId}</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Prompt Body */}
          <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-6 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-indigo-600/10">
              <MessageSquare size={26} className="text-indigo-400" />
            </div>
            <h4 className="text-sm font-extrabold text-white mb-1.5">What is your name? 👋</h4>
            <p className="text-xs text-white/50 mb-5 leading-relaxed px-2">
              Please enter your name so other room members know who is chatting on the canvas.
            </p>

            <div className="w-full space-y-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                placeholder="Type your name (e.g. Sarthak)..."
                autoFocus
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm sm:text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:bg-black/80 transition-all text-center font-bold"
              />
              <button
                onClick={handleSaveName}
                disabled={!nameInput.trim()}
                className={`
                  w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2
                  ${nameInput.trim()
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95"
                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                  }
                `}
              >
                <span>Start Chatting</span>
                <Sparkles size={14} />
              </button>
              {isEditingName && (
                <button
                  onClick={() => setIsEditingName(false)}
                  className="text-[10px] text-white/40 hover:text-white/80 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Unlocked Live Chat UI when activeMyName is set */}
      {isOpen && activeMyName && !isEditingName && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 bottom-20 sm:bottom-24 z-50 w-[calc(100vw-1rem)] sm:w-96 max-w-[420px] rounded-2xl sm:rounded-3xl bg-zinc-950/95 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-6 duration-200">
          {/* Panel Header */}
          <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <MessageSquare size={15} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">Live Room Chat</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-400 font-medium truncate max-w-[150px]">
                    Chatting as <strong className="text-white">{activeMyName}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setNameInput(activeMyName);
                      setIsEditingName(true);
                    }}
                    title="Change Name"
                    className="text-white/40 hover:text-indigo-400 transition-colors ml-1 shrink-0"
                  >
                    <Edit2 size={10} />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-3 touch-auto overscroll-contain [scrollbar-width:thin]">
            {messages.length === 0 ? (
              <div className="my-auto text-center flex flex-col items-center gap-2 px-6">
                <MessageCircle size={32} className="text-white/20 animate-pulse" />
                <p className="text-xs font-semibold text-white/50">No messages yet</p>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Start the conversation! Messages will be shared live with everyone in this room.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex flex-col max-w-[85%] ${
                    msg.isSelf ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[10px] font-bold mb-1 px-1 flex items-center gap-1.5">
                    {msg.isSelf ? (
                      <span className="text-indigo-300 font-semibold">You ({msg.senderName})</span>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-white font-bold">{msg.senderName}</span>
                      </>
                    )}
                  </span>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-sans shadow-md ${
                      msg.isSelf
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-white/10 text-white/90 border border-white/5 rounded-bl-xs"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[8px] text-white/30 mt-1 px-1 font-mono">{msg.timestamp}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div className="p-2.5 sm:p-3 bg-white/5 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type message & press Enter..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm sm:text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all font-sans"
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className={`
                p-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center shrink-0
                ${inputText.trim()
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                }
              `}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
