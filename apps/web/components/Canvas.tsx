import { useEffect, useRef, useState } from "react";
import { initDraw, ToolMode } from "../draw/index";
import { Square, Circle, ArrowUpRight, Triangle as TriangleIcon, Pencil, Undo2, Redo2, Trash2, Type, Eraser, Download, Sparkles, Lock, MousePointer, Hand, Minus, Plus, RotateCcw, Share2, Check, MessageSquare } from "lucide-react";
import { ChatOverlay } from "./ChatOverlay";

export function Canvas({ roomId, socket }: { roomId: string; socket: WebSocket }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeTool, setActiveTool] = useState<ToolMode>("pencil");
    const activeToolRef = useRef<ToolMode>("pencil");
    activeToolRef.current = activeTool;

    const [zoom, setZoom] = useState(1);

    const [activeColor, setActiveColor] = useState<string | null>(null);
    const activeColorRef = useRef<string | null>(null);
    activeColorRef.current = activeColor;

    const [activeSize, setActiveSize] = useState<number | null>(null);
    const activeSizeRef = useRef<number | null>(null);
    activeSizeRef.current = activeSize;

    const [colorOpen, setColorOpen] = useState<boolean>(false);
    const [sizeOpen, setSizeOpen] = useState<boolean>(false);
    const [exportOpen, setExportOpen] = useState<boolean>(false);
    const [chatOpen, setChatOpen] = useState<boolean>(false);
    const [userEmail, setUserEmail] = useState<string>("Member");
    const [showModal, setShowModal] = useState<boolean>(false);
    const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("userEmail");
            if (stored) setUserEmail(stored);
        }
    }, []);

    const toggleColor = () => {
        setColorOpen(!colorOpen);
        setSizeOpen(false);
        setExportOpen(false);
    };

    const toggleSize = () => {
        setSizeOpen(!sizeOpen);
        setColorOpen(false);
        setExportOpen(false);
    };

    const toggleExport = () => {
        setExportOpen(!exportOpen);
        setColorOpen(false);
        setSizeOpen(false);
    };

    const handleShare = () => {
        if (typeof window === "undefined") return;
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const isPremiumUser = () => {
        if (typeof window === "undefined") return false;
        const userEmail = localStorage.getItem("userEmail");
        const token = localStorage.getItem("token");
        if (!token || userEmail === "dev-user@example.com") {
            return false;
        }
        return true;
    };

    const handleExportPNG = () => {
        if (!isPremiumUser()) {
            setShowPremiumModal(true);
            setExportOpen(false);
            return;
        }
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const link = document.createElement("a");
        link.download = `diagram-${roomId}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setExportOpen(false);
    };

    const handleExportJSON = () => {
        if (!isPremiumUser()) {
            setShowPremiumModal(true);
            setExportOpen(false);
            return;
        }
        const shapes = drawActionsRef.current?.getShapes() || [];
        const jsonStr = JSON.stringify(shapes, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const link = document.createElement("a");
        link.download = `diagram-${roomId}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
        setExportOpen(false);
    };

    const handleExportSVG = () => {
        if (!isPremiumUser()) {
            setShowPremiumModal(true);
            setExportOpen(false);
            return;
        }
        const shapes = drawActionsRef.current?.getShapes() || [];
        const canvas = canvasRef.current;
        const width = canvas ? canvas.width : window.innerWidth;
        const height = canvas ? canvas.height : window.innerHeight;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
        svgContent += `  <rect width="100%" height="100%" fill="#09090b" />\n`;

        shapes.forEach((shape) => {
            const color = shape.color || "#ffffff";
            const size = shape.size || 2;

            if (shape.type === "rect") {
                svgContent += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="none" stroke="${color}" stroke-width="${size}" />\n`;
            } else if (shape.type === "circle") {
                svgContent += `  <circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" fill="none" stroke="${color}" stroke-width="${size}" />\n`;
            } else if (shape.type === "arrow") {
                svgContent += `  <line x1="${shape.x}" y1="${shape.y}" x2="${shape.endX}" y2="${shape.endY}" stroke="${color}" stroke-width="${size}" />\n`;
                const angle = Math.atan2(shape.endY - shape.y, shape.endX - shape.x);
                const headLength = 15;
                const x1 = shape.endX - headLength * Math.cos(angle - Math.PI / 6);
                const y1 = shape.endY - headLength * Math.sin(angle - Math.PI / 6);
                const x2 = shape.endX - headLength * Math.cos(angle + Math.PI / 6);
                const y2 = shape.endY - headLength * Math.sin(angle + Math.PI / 6);
                svgContent += `  <line x1="${shape.endX}" y1="${shape.endY}" x2="${x1}" y2="${y1}" stroke="${color}" stroke-width="${size}" />\n`;
                svgContent += `  <line x1="${shape.endX}" y1="${shape.endY}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${size}" />\n`;
            } else if (shape.type === "triangle") {
                svgContent += `  <polygon points="${shape.x},${shape.y} ${2 * shape.x - shape.endX},${shape.endY} ${shape.endX},${shape.endY}" fill="none" stroke="${color}" stroke-width="${size}" />\n`;
            } else if (shape.type === "pencil" && shape.points.length > 0) {
                let d = `M ${shape.points[0].x} ${shape.points[0].y}`;
                for (let i = 1; i < shape.points.length; i++) {
                    d += ` L ${shape.points[i].x} ${shape.points[i].y}`;
                }
                svgContent += `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round" />\n`;
            } else if (shape.type === "eraser" && shape.points.length > 0) {
                let d = `M ${shape.points[0].x} ${shape.points[0].y}`;
                for (let i = 1; i < shape.points.length; i++) {
                    d += ` L ${shape.points[i].x} ${shape.points[i].y}`;
                }
                svgContent += `  <path d="${d}" fill="none" stroke="#09090b" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round" />\n`;
            } else if (shape.type === "text") {
                const fontSize = size === 2 ? 14 : size === 6 ? 20 : size === 12 ? 28 : size === 20 ? 40 : 18;
                const escapedText = shape.text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                svgContent += `  <text x="${shape.x}" y="${shape.y + fontSize}" fill="${color}" font-family="sans-serif" font-size="${fontSize}px" text-anchor="start">{escapedText}</text>\n`;
            }
        });

        svgContent += `</svg>`;
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const link = document.createElement("a");
        link.download = `diagram-${roomId}.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
        setExportOpen(false);
    };



    const drawActionsRef = useRef<{
        undo: () => void;
        redo: () => void;
        clear: () => void;
        getShapes: () => any[];
        resetView: () => void;
        zoomIn: () => void;
        zoomOut: () => void;
        updateSelectedShapeColor: (color: string) => void;
        updateSelectedShapeSize: (size: number) => void;
    } | null>(null);

    useEffect(() => {
        let drawInstance: { cleanup: () => void; undo: () => void; redo: () => void; clear: () => void; getShapes: () => any[]; resetView: () => void; zoomIn: () => void; zoomOut: () => void; updateSelectedShapeColor: (c: string) => void; updateSelectedShapeSize: (s: number) => void } | undefined;

        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;

            const res = initDraw(
                canvasRef.current,
                roomId,
                socket,
                () => activeToolRef.current,
                () => activeColorRef.current,
                () => activeSizeRef.current,
                () => setShowModal(true),
                (newZoom) => {
                    setZoom(newZoom);
                }
            );
            if (res) {
                drawInstance = res;
                drawActionsRef.current = {
                    undo: res.undo,
                    redo: res.redo,
                    clear: res.clear,
                    getShapes: res.getShapes,
                    resetView: res.resetView,
                    zoomIn: res.zoomIn,
                    zoomOut: res.zoomOut,
                    updateSelectedShapeColor: (c: string) => res.updateSelectedShapeColor?.(c),
                    updateSelectedShapeSize: (s: number) => res.updateSelectedShapeSize?.(s)
                };
            }
        }

        const handleResize = () => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");
                const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                if (ctx && imageData) {
                    ctx.putImageData(imageData, 0, 0);
                }
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (drawInstance) {
                drawInstance.cleanup();
            }
            drawActionsRef.current = null;
        };
    }, [roomId, socket]); // canvasRef intentionally omitted — refs are stable

    const tools = [
        { id: "select" as ToolMode, icon: MousePointer, label: "Select" },
        { id: "pencil" as ToolMode, icon: Pencil, label: "Pencil" },
        { id: "rect" as ToolMode, icon: Square, label: "Rectangle" },
        { id: "circle" as ToolMode, icon: Circle, label: "Circle" },
        { id: "arrow" as ToolMode, icon: ArrowUpRight, label: "Arrow" },
        { id: "triangle" as ToolMode, icon: TriangleIcon, label: "Triangle" },
        { id: "text" as ToolMode, icon: Type, label: "Text" },
        { id: "eraser" as ToolMode, icon: Eraser, label: "Eraser" },
        { id: "pan" as ToolMode, icon: Hand, label: "Pan" }
    ];

    const colors = [
        { value: "#ffffff", label: "White" },
        { value: "#ef4444", label: "Red" },
        { value: "#f97316", label: "Orange" },
        { value: "#facc15", label: "Yellow" },
        { value: "#22c55e", label: "Green" },
        { value: "#3b82f6", label: "Blue" },
        { value: "#a855f7", label: "Purple" },
        { value: "#ec4899", label: "Pink" }
    ];

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#09090b]">
            {/* Elegant Floating Toolbar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            title={tool.label}
                            className={`
                                flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease-out cursor-pointer
                                ${isActive
                                    ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105"
                                    : "text-white/50 hover:text-white hover:bg-white/5 hover:scale-105 active:scale-95"
                                }
                            `}
                        >
                            <Icon size={18} strokeWidth={2.2} />
                        </button>
                    );
                })}

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                {/* Color Selector Dropdown */}
                <div className="relative">
                    <button
                        onClick={toggleColor}
                        className="flex items-center gap-2.5 px-3 py-2 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 text-white cursor-pointer select-none"
                    >
                        {activeColor ? (
                            <>
                                <div
                                    style={{ backgroundColor: activeColor }}
                                    className="w-3 h-3 rounded-full border border-white/25"
                                />
                                <span className="text-[10px] font-bold tracking-wider uppercase select-none">
                                    {colors.find(c => c.value === activeColor)?.label || "White"}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-3 h-3 rounded-full border border-dashed border-white/40 bg-transparent" />
                                <span className="text-[10px] font-bold tracking-wider uppercase text-white/50 select-none">
                                    Color
                                </span>
                            </>
                        )}
                        <span className="text-white/40 text-[9px] select-none">▼</span>
                    </button>

                    {/* Color Dropdown Options */}
                    {colorOpen && (
                        <div className="absolute top-12 left-0 z-50 flex flex-col gap-1 p-1 rounded-xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl min-w-[140px]">
                            {colors.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => {
                                        setActiveColor(color.value);
                                        setColorOpen(false);
                                        drawActionsRef.current?.updateSelectedShapeColor?.(color.value);
                                    }}
                                    className={`
                                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition-all duration-150 hover:bg-white/5 select-none
                                        ${activeColor === color.value ? "text-indigo-400 bg-indigo-500/10" : "text-white/70 hover:text-white"}
                                    `}
                                >
                                    <div
                                        style={{ backgroundColor: color.value }}
                                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                                    />
                                    <span className="uppercase tracking-wider text-[10px] font-bold">{color.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Size Selector Dropdown */}
                <div className="relative">
                    <button
                        onClick={toggleSize}
                        className="flex items-center gap-2.5 px-3 py-2 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 text-white cursor-pointer select-none"
                    >
                        {activeSize ? (
                            <>
                                <div className={`rounded-full bg-white ${activeSize === 2 ? "w-1 h-1" :
                                        activeSize === 6 ? "w-1.5 h-1.5" :
                                            activeSize === 12 ? "w-2.5 h-2.5" : "w-3.5 h-3.5"
                                    }`} />
                                <span className="text-[10px] font-bold tracking-wider uppercase select-none">
                                    {activeSize === 2 ? "Thin" :
                                        activeSize === 6 ? "Medium" :
                                            activeSize === 12 ? "Thick" : "Extra Thick"}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full border border-dashed border-white/40 bg-transparent" />
                                <span className="text-[10px] font-bold tracking-wider uppercase text-white/50 select-none">
                                    Size
                                </span>
                            </>
                        )}
                        <span className="text-white/40 text-[9px] select-none">▼</span>
                    </button>

                    {/* Size Dropdown Options */}
                    {sizeOpen && (
                        <div className="absolute top-12 right-0 z-50 flex flex-col gap-1 p-1 rounded-xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl min-w-[160px]">
                            {[
                                { val: 2, label: "Thin (2px / 14px text)", name: "Thin", desc: "2px", dotSize: "w-1 h-1" },
                                { val: 6, label: "Medium (6px / 20px text)", name: "Medium", desc: "6px", dotSize: "w-2 h-2" },
                                { val: 12, label: "Thick (12px / 28px text)", name: "Thick", desc: "12px", dotSize: "w-3.5 h-3.5" },
                                { val: 20, label: "Extra Thick (20px / 40px text)", name: "Extra Thick", desc: "20px", dotSize: "w-5 h-5" }
                            ].map((sz) => (
                                <button
                                    key={sz.val}
                                    onClick={() => {
                                        setActiveSize(sz.val);
                                        setSizeOpen(false);
                                        drawActionsRef.current?.updateSelectedShapeSize?.(sz.val);
                                    }}
                                    className={`
                                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition-all duration-150 hover:bg-white/5 select-none
                                        ${activeSize === sz.val ? "text-indigo-400 bg-indigo-500/10" : "text-white/70 hover:text-white"}
                                    `}
                                >
                                    <div className={`rounded-full bg-current ${sz.dotSize}`} />
                                    <span className="uppercase tracking-wider text-[10px] font-bold">{sz.name}</span>
                                    <span className="text-[8px] text-white/30 ml-auto font-normal">{sz.desc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                {/* Undo Button */}
                <button
                    onClick={() => drawActionsRef.current?.undo()}
                    title="Undo"
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5 hover:scale-105 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
                >
                    <Undo2 size={18} strokeWidth={2.2} />
                </button>

                {/* Redo Button */}
                <button
                    onClick={() => drawActionsRef.current?.redo()}
                    title="Redo"
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5 hover:scale-105 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
                >
                    <Redo2 size={18} strokeWidth={2.2} />
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                {/* Export / Download Dropdown */}
                <div className="relative">
                    <button
                        onClick={toggleExport}
                        title="Export Diagram"
                        className={`
                            flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 ease-out hover:scale-105 active:scale-95
                            ${exportOpen ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105" : "text-white/50 hover:text-white hover:bg-white/5"}
                        `}
                    >
                        <Download size={18} strokeWidth={2.2} />
                    </button>

                    {/* Export Dropdown Options */}
                    {exportOpen && (
                        <div className="absolute top-12 right-0 z-50 flex flex-col gap-1 p-1.5 rounded-xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl min-w-[180px]">
                            <div className="px-2.5 py-1.5 text-[9px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-1 flex items-center justify-between">
                                <span>Export Format</span>
                                {!isPremiumUser() && <Lock size={10} className="text-yellow-500" />}
                            </div>

                            <button
                                onClick={handleExportPNG}
                                className="flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer text-white/70 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <span>Export to PNG</span>
                                {!isPremiumUser() && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold">Free</span>}
                            </button>

                            <button
                                onClick={handleExportSVG}
                                className="flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer text-white/70 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <span>Export to SVG</span>
                                {!isPremiumUser() && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold">Free</span>}
                            </button>

                            <button
                                onClick={handleExportJSON}
                                className="flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer text-white/70 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <span>Export to JSON</span>
                                {!isPremiumUser() && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold">Free</span>}
                            </button>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                {/* Clear Canvas Button */}
                <button
                    onClick={() => {
                        if (confirm("Are you sure you want to clear the entire collaborative canvas? This cannot be undone!")) {
                            drawActionsRef.current?.clear();
                        }
                    }}
                    title="Clear Canvas"
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
                >
                    <Trash2 size={18} strokeWidth={2.2} />
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                {/* Share Room Button */}
                <button
                    onClick={handleShare}
                    title="Copy Room Link"
                    className={`
                        flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease-out cursor-pointer hover:scale-105 active:scale-95
                        ${copied
                            ? "text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(52,211,153,0.25)]"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }
                    `}
                >
                    {copied ? <Check size={18} strokeWidth={2.5} /> : <Share2 size={18} strokeWidth={2.2} />}
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                {/* Chat Panel Toggle Button */}
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    title={isPremiumUser() ? "Toggle Live Chat" : "Sign In to Unlock Live Chat"}
                    className={`
                        relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease-out cursor-pointer hover:scale-105 active:scale-95
                        ${chatOpen
                            ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }
                    `}
                >
                    <MessageSquare size={18} strokeWidth={2.2} />
                    {!isPremiumUser() && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-500 text-black flex items-center justify-center text-[9px] font-extrabold border border-black shadow">
                            🔒
                        </span>
                    )}
                </button>
            </div>

            {/* Invisible backdrop overlay to close dropdowns when clicking away */}
            {(colorOpen || sizeOpen || exportOpen) && (
                <div className="fixed inset-0 z-40" onClick={() => { setColorOpen(false); setSizeOpen(false); setExportOpen(false); }} />
            )}

            {/* Share Toast Notification */}
            <div
                style={{
                    position: "fixed",
                    bottom: "88px",
                    left: "50%",
                    transform: copied ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(16px)",
                    opacity: copied ? 1 : 0,
                    pointerEvents: "none",
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    zIndex: 200,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    backdropFilter: "blur(12px)",
                    color: "#6ee7b7",
                    fontSize: "13px",
                    fontWeight: 600,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(52,211,153,0.15)",
                    whiteSpace: "nowrap"
                }}
            >
                <Check size={15} strokeWidth={2.5} />
                Room link copied to clipboard!
            </div>

            {/* Properties Selection Modal Popup */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes scaleUp {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-fade-in {
                            animation: fadeIn 0.2s ease-out forwards;
                        }
                        .animate-scale-up {
                            animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                        }
                    `}</style>
                    <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-scale-up text-white flex flex-col gap-6">
                        <div className="flex flex-col gap-1.5 text-center">
                            <h2 className="text-xl font-bold tracking-wide uppercase text-indigo-400">Brush Settings Required</h2>
                            <p className="text-white/40 text-xs">Choose a color and size to unlock the canvas and start drawing!</p>
                        </div>

                        {/* Color Selector Section */}
                        <div className="flex flex-col gap-2.5">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-white/50 pl-1">Choose Color</span>
                            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-black/30 border border-white/5">
                                {colors.map((color) => {
                                    const isSelected = activeColor === color.value;
                                    return (
                                        <button
                                            key={color.value}
                                            onClick={() => setActiveColor(color.value)}
                                            className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 active:scale-95
                                                ${isSelected
                                                    ? "bg-white/15 text-white border border-white/20 scale-105"
                                                    : "text-white/40 hover:text-white border border-transparent"
                                                }
                                            `}
                                        >
                                            <div
                                                style={{ backgroundColor: color.value }}
                                                className="w-2.5 h-2.5 rounded-full border border-white/25"
                                            />
                                            <span className="text-[9px] font-bold tracking-wider uppercase select-none">{color.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Size Selector Section */}
                        <div className="flex flex-col gap-2.5">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-white/50 pl-1">Choose Size</span>
                            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-black/30 border border-white/5">
                                {[
                                    { val: 2, name: "Thin", desc: "2px", dotSize: "w-1 h-1" },
                                    { val: 6, name: "Medium", desc: "6px", dotSize: "w-2 h-2" },
                                    { val: 12, name: "Thick", desc: "12px", dotSize: "w-3 h-3" },
                                    { val: 20, name: "Extra Thick", desc: "20px", dotSize: "w-4 h-4" }
                                ].map((sz) => {
                                    const isSelected = activeSize === sz.val;
                                    return (
                                        <button
                                            key={sz.val}
                                            onClick={() => setActiveSize(sz.val)}
                                            className={`
                                                flex items-center gap-2 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 active:scale-95
                                                ${isSelected
                                                    ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105"
                                                    : "text-white/40 hover:text-white"
                                                }
                                            `}
                                        >
                                            <div className={`rounded-full bg-current ${sz.dotSize}`} />
                                            <span className="text-[9px] font-bold tracking-wider uppercase select-none">{sz.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <button
                            disabled={!activeColor || !activeSize}
                            onClick={() => setShowModal(false)}
                            className={`
                                mt-2 w-full py-3 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all duration-300 active:scale-98 shadow-lg cursor-pointer
                                ${activeColor && activeSize
                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:scale-[1.02]"
                                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                                }
                            `}
                        >
                            Start Drawing & Typing
                        </button>
                    </div>
                </div>
            )}

            {/* Premium Upgrade paywall Modal Popup */}
            {showPremiumModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-scale-up text-white flex flex-col gap-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-yellow-500/10">
                            <Sparkles className="w-7 h-7 text-white animate-bounce" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                                Unlock Premium Exports
                            </h2>
                            <p className="text-white/60 text-xs leading-relaxed px-4">
                                Exporting high-resolution PNGs, vector SVGs, and raw JSON diagrams is a registered user feature.
                            </p>
                            <p className="text-white/40 text-[11px] leading-relaxed px-6 mt-1">
                                Create a free account in 5 seconds to instantly download, backup, and share your visual masterpieces!
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("userEmail");
                                    window.location.href = "/signup";
                                }}
                                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-2xl transition-all shadow-lg shadow-yellow-500/10 hover:scale-[1.02] active:scale-98 text-xs uppercase tracking-wider cursor-pointer"
                            >
                                Sign Up Free Now
                            </button>
                            <button
                                onClick={() => setShowPremiumModal(false)}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-semibold rounded-2xl transition-all border border-white/5 text-xs uppercase tracking-wider cursor-pointer"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zoom Controls */}
            <div className="absolute bottom-6 left-6 z-50 flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                <button
                    onClick={() => drawActionsRef.current?.zoomOut()}
                    title="Zoom Out"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                    <Minus size={16} strokeWidth={2.2} />
                </button>
                <span className="text-[10px] font-bold tracking-wider text-white/70 min-w-[40px] text-center select-none uppercase">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={() => drawActionsRef.current?.zoomIn()}
                    title="Zoom In"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                    <Plus size={16} strokeWidth={2.2} />
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                <button
                    onClick={() => drawActionsRef.current?.resetView()}
                    title="Reset View"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                    <RotateCcw size={16} strokeWidth={2.2} />
                </button>
            </div>

            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* Right-Side Real-Time Live Chat Overlay Panel */}
            <ChatOverlay
                socket={socket}
                roomId={roomId}
                userEmail={userEmail}
                isLoggedIn={isPremiumUser()}
                isOpen={chatOpen}
                onToggle={() => setChatOpen(!chatOpen)}
            />
        </div>
    );
}
