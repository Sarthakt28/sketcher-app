"use client"
import { WS_URL, HTTP_BACKEND } from "@/app/config"
import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import axios from "axios";

function getWsUrl(configuredUrl: string): string {
    let cleanUrl = (configuredUrl || "ws://localhost:8080").trim();
    if (typeof window !== "undefined" && cleanUrl.includes("localhost") && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        cleanUrl = cleanUrl.replace("localhost", window.location.hostname);
    }
    if (cleanUrl.startsWith("http://")) {
        cleanUrl = cleanUrl.replace("http://", "ws://");
    } else if (cleanUrl.startsWith("https://")) {
        cleanUrl = cleanUrl.replace("https://", "wss://");
    }
    if (!cleanUrl.startsWith("ws://") && !cleanUrl.startsWith("wss://")) {
        if (cleanUrl.includes("onrender.com") || cleanUrl.includes("vercel.app") || !cleanUrl.includes("localhost")) {
            cleanUrl = "wss://" + cleanUrl;
        } else {
            cleanUrl = "ws://" + cleanUrl;
        }
    }
    return cleanUrl;
}

function getResolvedHttpBackend(): string {
    let url = HTTP_BACKEND || "http://localhost:3002";
    if (typeof window !== "undefined" && url.includes("localhost") && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        url = url.replace("localhost", window.location.hostname);
    }
    return url;
}

// Global authentication promise lock to prevent concurrent/StrictMode race conditions in development
let globalAuthPromise: Promise<string> | null = null;

async function getOrPerformDevLogin(): Promise<string> {
    if (globalAuthPromise) {
        console.log("[RoomCanvas] Awaiting existing parallel authentication process...");
        return globalAuthPromise;
    }
    
    globalAuthPromise = (async () => {
        try {
            const devUser = {
                username: "dev-user@example.com",
                password: "password123",
                name: "Dev User"
            };

            const backendUrl = getResolvedHttpBackend();

            // 1. Attempt dynamic dev registration
            try {
                await axios.post(`${backendUrl}/signup`, devUser);
                console.log("[RoomCanvas] Auto-registered local dev account");
            } catch (e) {
                // User already exists — fine
            }

            // 2. Perform dev signin
            const signinRes = await axios.post(`${backendUrl}/signin`, {
                username: devUser.username,
                password: devUser.password
            });

            if (signinRes.data?.token) {
                const token = signinRes.data.token;
                localStorage.setItem("token", token);
                console.log("[RoomCanvas] Auto-signin successful, token saved");
                return token;
            }
        } catch (err) {
            console.error("[RoomCanvas] Global dev authentication failed:", err);
        } finally {
            globalAuthPromise = null; // Release the lock
        }
        return "";
    })();
    
    return globalAuthPromise;
}

export function RoomCanvas({roomId}:{
    roomId: string;
}){
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasConnectedOnce, setHasConnectedOnce] = useState<boolean>(false);
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let active = true;
        let pingInterval: any = null;

        let retryCount = 0;
        let reconnectTimeout: any = null;

        async function connect() {
            if (!active) return;
            let token = localStorage.getItem("token") || "";
            
            if (!token) {
                console.log("[RoomCanvas] No token found. Attempting automatic guest/free account login...");
                token = await getOrPerformDevLogin();
                if (token) {
                    localStorage.setItem("token", token);
                    localStorage.setItem("userEmail", "dev-user@example.com");
                } else if (active) {
                    window.location.href = "/signup";
                    return;
                }
            }

            if (!active) return;

            console.log(`[RoomCanvas] Connecting to WebSocket (attempt ${retryCount + 1})...`);
            
            try {
                const resolvedWsUrl = getWsUrl(WS_URL);
                const socketInstance = new WebSocket(`${resolvedWsUrl}?token=${token}`);
                ws = socketInstance;
                
                socketInstance.onopen = () => {
                    if (!active) {
                        socketInstance.close();
                        return;
                    }
                    retryCount = 0; // Reset retry counter on successful connection
                    setIsReconnecting(false);
                    setHasConnectedOnce(true);
                    setError(null);
                    setSocket(socketInstance);
                    socketInstance.send(JSON.stringify({
                        type: "join",
                        roomId
                    }));

                    // Send ping heartbeats every 15s to keep reverse proxies (Render, AWS, Cloudflare) from terminating idle connections
                    if (pingInterval) clearInterval(pingInterval);
                    pingInterval = setInterval(() => {
                        if (socketInstance.readyState === WebSocket.OPEN) {
                            socketInstance.send(JSON.stringify({ type: "ping" }));
                        }
                    }, 15000);
                };
                
                socketInstance.onerror = () => {
                    console.warn("[RoomCanvas] WebSocket connection error (handled in onclose)");
                };
                
                socketInstance.onclose = (event) => {
                    console.log("[RoomCanvas] WebSocket closed:", event.code, event.reason);
                    if (pingInterval) {
                        clearInterval(pingInterval);
                        pingInterval = null;
                    }
                    if (!active) return; // StrictMode cleanup — ignore silently
                    
                    setIsReconnecting(true);
                    
                    if (event.code === 4001) {
                        console.log("[RoomCanvas] Token rejected by server (4001). Clearing token & re-authenticating...");
                        localStorage.removeItem("token");
                        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
                        retryCount++;
                        reconnectTimeout = setTimeout(connect, delay);
                    } else if (event.code !== 1000 && event.code !== 1001) {
                        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
                        retryCount++;
                        console.log(`[RoomCanvas] Disconnected (code ${event.code}). Auto-reconnecting in ${delay}ms (attempt ${retryCount})...`);
                        if (retryCount >= 4) {
                            localStorage.removeItem("token");
                        }
                        reconnectTimeout = setTimeout(connect, delay);
                    }
                };
            } catch (err: any) {
                console.error("[RoomCanvas] Connection initialization failed:", err);
                if (active) {
                    setIsReconnecting(true);
                    const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
                    retryCount++;
                    reconnectTimeout = setTimeout(connect, delay);
                    if (!hasConnectedOnce && retryCount >= 5) {
                        setError(`Failed to connect to drawing server: ${err.message || String(err)}`);
                    }
                }
            }
        }

        connect();

        const handleVisibilityOrOnline = () => {
            if (document.visibilityState === "visible") {
                if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                    console.log("[RoomCanvas] Tab resumed or network restored; reconnecting immediately...");
                    if (reconnectTimeout) clearTimeout(reconnectTimeout);
                    connect();
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityOrOnline);
        window.addEventListener("online", handleVisibilityOrOnline);

        return () => {
            active = false;
            document.removeEventListener("visibilitychange", handleVisibilityOrOnline);
            window.removeEventListener("online", handleVisibilityOrOnline);
            if (pingInterval) {
                clearInterval(pingInterval);
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (ws) {
                ws.close();
            }
        };
    }, [roomId, hasConnectedOnce]);

    // Error State Renderer (only shown if initial connection failed completely)
    if (!hasConnectedOnce && error) {
        return (
            <div className="w-screen h-screen flex flex-col justify-center items-center bg-[#0a0a0f] text-white px-6">
                <div className="max-w-md w-full bg-white/[0.03] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-red-500 text-lg font-bold">!</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Connection Issue</h2>
                    <p className="text-xs text-white/50 mb-6 leading-relaxed px-2">{error}</p>
                    
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                localStorage.removeItem("token");
                                setError(null);
                                window.location.reload();
                            }}
                            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20 text-xs uppercase tracking-wider"
                        >
                            Reset Session & Retry
                        </button>
                        <a
                            href="/canvas"
                            className="block w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold rounded-xl transition-all text-xs uppercase tracking-wider"
                        >
                            Back to Lobby
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasConnectedOnce) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                width: "100vw",
                backgroundColor: "#000",
                color: "#fff",
                fontFamily: "sans-serif",
                gap: "16px"
            }}>
                <div style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid #333",
                    borderTop: "3px solid #6366f1",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>Connecting to canvas...</p>
            </div>
        );
    }

    return (
        <>
            {isReconnecting && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-md text-amber-300 text-xs shadow-lg animate-pulse select-none pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Reconnecting to server...
                </div>
            )}
            <Canvas roomId={roomId} socket={socket} />
        </>
    );
}