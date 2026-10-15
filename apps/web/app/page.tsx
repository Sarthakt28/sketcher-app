"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Triangle,
  Type,
  Eraser,
  MousePointer,
  Hand,
  Download,
  Share2,
  Users,
  MessageSquare,
  CheckCircle2,
  Menu,
  X,
  Undo2,
  Redo2,
  Layers,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [quickRoom, setQuickRoom] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleJoinQuickRoom = (e: FormEvent) => {
    e.preventDefault();
    if (quickRoom.trim()) {
      const target = `/canvas/${encodeURIComponent(quickRoom.trim().toLowerCase())}`;
      router.push(target);
    } else {
      handleCreateRandomRoom();
    }
  };

  const handleCreateRandomRoom = () => {
    const randomId = Math.random().toString(36).substring(2, 9);
    router.push(`/canvas/${randomId}`);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled ? "bg-[#090a0f]/90 backdrop-blur-md border-b border-white/10" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Pencil className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white/90">Sketcher</span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
              v1.0 • open source
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#canvas-preview" className="hover:text-white transition-colors">Preview</a>
            <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#shortcuts" className="hover:text-white transition-colors">Shortcuts</a>
            <a
              href="https://github.com/sarthakt28/sketcher-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors text-white/50"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="/signin"
              className="text-xs uppercase font-medium tracking-wider text-white/60 hover:text-white px-3 py-2 transition-colors"
            >
              Sign In
            </a>
            <button
              onClick={handleCreateRandomRoom}
              className="text-xs uppercase tracking-wider font-semibold bg-white text-black hover:bg-white/90 px-4 py-2 rounded-lg transition-all shadow-sm"
            >
              Start Drawing
            </button>
          </div>

          <button
            className="md:hidden text-white/70 hover:text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#0d0e14] border-b border-white/10 px-6 py-4 flex flex-col gap-3 text-sm">
            <a href="#canvas-preview" className="text-white/60 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Preview</a>
            <a href="#features" className="text-white/60 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Capabilities</a>
            <a href="#shortcuts" className="text-white/60 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Shortcuts</a>
            <a
              href="https://github.com/sarthakt28/sketcher-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/60 hover:text-white py-1"
            >
              <GithubIcon className="w-4 h-4" /> GitHub Repository
            </a>
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <a href="/signin" className="text-center py-2 text-white/60 hover:text-white">Sign In</a>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleCreateRandomRoom();
                }}
                className="w-full text-center py-2.5 bg-white text-black font-semibold rounded-lg"
              >
                Start Drawing
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
        {/* Subtle engineering grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-4xl mx-auto">
          {/* Natural status pill */}
          <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-full px-3.5 py-1 text-xs text-white/70 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Low-latency collaborative canvas with Vector-Splitting Eraser</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.15] mb-5 text-white/95">
            A fast, distraction-free whiteboard for diagramming and thinking out loud.
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-8">
            Sketch architectural flows, draw wireframes, and collaborate with your team in real time.
            Zero bloat, no forced sign-ups, and works directly in your browser.
          </p>

          {/* Quick Start Room Input */}
          <div className="max-w-md mx-auto mb-6">
            <form onSubmit={handleJoinQuickRoom} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Enter a room name (e.g. system-design)"
                  value={quickRoom}
                  onChange={(e) => setQuickRoom(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/15 focus:border-sky-500 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-sky-500/15"
              >
                <span>Open Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-white/40">
            <button
              onClick={handleCreateRandomRoom}
              className="underline hover:text-white/80 transition-colors"
            >
              Or create an instant anonymous room →
            </button>
          </div>
        </div>

        {/* Real Product UI Mockup */}
        <div id="canvas-preview" className="relative max-w-5xl mx-auto mt-14 text-left">
          <div className="rounded-2xl border border-white/15 bg-[#0f1017] shadow-2xl overflow-hidden">
            {/* Top Toolbar matching actual Sketcher app */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#14151f] border-b border-white/10 text-xs text-white/70">
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <div className="flex items-center gap-1 pr-3 border-r border-white/10">
                  <span className="p-1.5 rounded-lg bg-white/10 text-white" title="Select (V)"><MousePointer className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Hand (H)"><Hand className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Pencil (P)"><Pencil className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Rectangle (R)"><Square className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Circle (C)"><Circle className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Triangle (T)"><Triangle className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Arrow (A)"><ArrowRight className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg text-white/50 hover:bg-white/5" title="Text"><Type className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium flex items-center gap-1" title="Eraser (E)">
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">Vector Eraser</span>
                  </span>
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-1.5 pl-3">
                  {["#FFFFFF", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#A855F7"].map((color) => (
                    <span
                      key={color}
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync (WebSocket)
                </span>
                <span className="text-[11px] text-white/40 font-mono hidden sm:inline">Zoom: 100%</span>
              </div>
            </div>

            {/* Canvas Body with Authentic Architecture Sketch */}
            <div className="relative h-[360px] sm:h-[420px] bg-[#0c0d14] overflow-hidden select-none">
              {/* Dot Grid */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              {/* Real Diagram SVG */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 920 420">
                <defs>
                  <marker id="marker-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#38bdf8" />
                  </marker>
                  <marker id="marker-muted" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
                  </marker>
                </defs>

                {/* Node 1: Client Browser */}
                <rect x="70" y="80" width="200" height="120" rx="10" fill="#141522" stroke="#38bdf8" strokeWidth="2" />
                <text x="170" y="125" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600" fontFamily="sans-serif">Next.js 16 Web App</text>
                <text x="170" y="148" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="sans-serif">HTML5 Canvas Engine</text>
                <text x="170" y="170" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">Port :3000</text>

                {/* Arrow 1 to WS Gateway */}
                <path d="M270 140 L370 140" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#marker-arrow)" />
                <text x="320" y="130" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">ws: // live</text>

                {/* Node 2: WS Backend */}
                <rect x="370" y="80" width="200" height="120" rx="10" fill="#141522" stroke="#22c55e" strokeWidth="2" />
                <text x="470" y="125" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600" fontFamily="sans-serif">WebSocket Gateway</text>
                <text x="470" y="148" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="sans-serif">Live Stroke Broadcast</text>
                <text x="470" y="170" textAnchor="middle" fill="#22c55e" fontSize="10" fontFamily="monospace">Port :8080</text>

                {/* Arrow 2 to Database */}
                <path d="M470 200 L470 270" stroke="#64748b" strokeWidth="2" markerEnd="url(#marker-muted)" />
                <text x="520" y="240" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">Prisma Client</text>

                {/* Node 3: PostgreSQL */}
                <rect x="370" y="270" width="200" height="90" rx="10" fill="#141522" stroke="#a855f7" strokeWidth="1.5" />
                <text x="470" y="310" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600" fontFamily="sans-serif">PostgreSQL 16</text>
                <text x="470" y="332" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="sans-serif">Shape &amp; Chat Storage</text>

                {/* Vector Stroke Cut Demo Annotation */}
                <path d="M640 100 Q670 70 700 100 Q730 130 760 100" fill="none" stroke="#f472b6" strokeWidth="2.5" />
                <text x="700" y="80" textAnchor="middle" fill="#f472b6" fontSize="11" fontFamily="monospace">splitStrokeWithEraser()</text>

                {/* Simulated Real Eraser Circle */}
                <circle cx="700" cy="100" r="16" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="735" y="135" fill="#f87171" fontSize="10" fontFamily="sans-serif">← Real stroke splitting</text>

                {/* Simulated Collaborator Cursor */}
                <g transform="translate(230, 240)">
                  <path d="M0 0 L0 18 L5 13 L9 20 L11 19 L7 12 L14 12 Z" fill="#38bdf8" />
                  <rect x="14" y="12" width="75" height="18" rx="4" fill="#0284c7" />
                  <text x="18" y="25" fill="#ffffff" fontSize="10" fontWeight="500" fontFamily="sans-serif">Sarah (online)</text>
                </g>
              </svg>

              {/* Mini Collapsible Chat Overlay Preview */}
              <div className="absolute bottom-4 right-4 w-64 bg-[#141520]/95 border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-sm hidden sm:block">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-white/50">
                  <span className="flex items-center gap-1.5 text-white/80 font-medium">
                    <MessageSquare className="w-3 h-3 text-sky-400" /> Room Discussion
                  </span>
                  <span>2 online</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p className="text-white/60"><span className="text-sky-400 font-medium">Sarah:</span> "Erase the old endpoint node"</p>
                  <p className="text-white/60"><span className="text-emerald-400 font-medium">You:</span> "Done, updated architecture."</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Dock */}
        <div id="shortcuts" className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/50 font-mono">
          <span className="text-white/30 mr-1">Hotkeys:</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">P Pencil</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">R Rectangle</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">C Circle</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">A Arrow</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">E Eraser</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">V Select</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">Space + Drag Pan</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">Ctrl + Z Undo</span>
        </div>
      </section>

      {/* Concrete Capabilities Section */}
      <section id="features" className="py-24 px-6 border-t border-white/5 bg-[#0b0c12]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-sky-400 text-xs font-mono uppercase tracking-widest mb-2">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Engineered for seamless sketching.
            </h2>
            <p className="text-white/50 text-base leading-relaxed">
              Every detail is designed to feel responsive, accurate, and reliable during high-speed team discussions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Eraser className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold mb-2">Vector-Splitting Eraser</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                True geometric polyline mutation. Touching any shape splits it into clean sub-strokes without leaving invisible cutout masks or clipping new drawings.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold mb-2">Infinite Zoom &amp; Pan</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Smooth scaling from 10% to 2000%. Includes 2-finger touch gestures with gesture-mutex locking to eliminate accidental palm lines on touchscreens.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold mb-2">Sub-Millisecond Sync</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Lightweight WebSocket protocol transmits vector points with zero lag. Automatically reconnects with exponential backoff if your connection drops.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold mb-2">In-Room Live Chat</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Docked collapsible sidebar with tab-isolated session identities and floating unread message badges, so teammates don't talk over each other.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold mb-2">Lossless Export</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Export to high-resolution PNG, resolution-independent vector SVG, or raw JSON shape snapshots to drop diagrams straight into docs or presentations.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold mb-2">One-Click Share</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Copy the direct room link to your clipboard. Anyone who opens the URL immediately syncs with your current canvas state and database history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer / Open Source Banner */}
      <section className="py-20 px-6 border-t border-white/5 bg-[#090a0f]">
        <div className="max-w-4xl mx-auto rounded-2xl bg-white/[0.02] border border-white/10 p-8 sm:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3">
            Open source &amp; self-hostable.
          </h3>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Built as a Turborepo monorepo with Next.js 16, Express, WebSocket gateways, and Prisma ORM. Inspect the source or deploy your own private instance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCreateRandomRoom}
              className="bg-white text-black font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-white/90 transition-all shadow-md"
            >
              Launch Whiteboard
            </button>
            <a
              href="https://github.com/sarthakt28/sketcher-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all"
            >
              <GithubIcon className="w-4 h-4" /> View On GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6 text-xs text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/70 font-medium">
            <Pencil className="w-4 h-4 text-sky-400" />
            <span>Sketcher Whiteboard</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/sarthakt28/sketcher-app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              MIT License
            </a>
            <a href="https://github.com/sarthakt28/sketcher-app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4" />
    </svg>
  );
}
