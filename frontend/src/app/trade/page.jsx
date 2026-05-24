"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Script from "next/script";

export default function TradeTerminal() {
  const { user } = useUser();
  const [orderType, setOrderType] = useState("Market");
  const [quantity, setQuantity] = useState("1.00");
  const [limitPrice, setLimitPrice] = useState("64231.50");
  const [livePrice, setLivePrice] = useState(64231.50);
  const [activeTab, setActiveTab] = useState("positions");

  // Real-time market streaming engine connection
  useEffect(() => {
    const wsUrl = "wss://stream.binance.com:9443/ws/btcusdt@ticker";
    const marketSocket = new WebSocket(wsUrl);

    marketSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.c) {
          setLivePrice(parseFloat(data.c));
        }
      } catch (err) {
        console.error("Market data parse exception:", err);
      }
    };

    marketSocket.onerror = (error) => console.error("WebSocket Error:", error);

    return () => marketSocket.close();
  }, []);

  const initializeTradingViewWidget = () => {
    if (typeof window !== "undefined" && window.TradingView) {
      new window.TradingView.widget({
        autosize: true,
        symbol: "BINANCE:BTCUSDT",
        interval: "1",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: "advanced_tradingview_canvas",
        studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
        loading_screen: { backgroundColor: "#000000" }
      });
    }
  };

  const executeOrderPipeline = async (side) => {
    if (!user) return alert("System state error: Authenticating session...");

    const executionPayload = {
      userEmail: user.primaryEmailAddress.emailAddress,
      symbol: "BTC/USDT",
      side: side,
      orderType: orderType,
      quantity: parseFloat(quantity),
      price: orderType === "Market" ? livePrice : parseFloat(limitPrice),
      timestamp: Date.now()
    };

    try {
      const targetApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${targetApiUrl}/api/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executionPayload)
      });

      const serverResult = await response.json();

      if (response.ok) {
        alert(`Order Dispatched Successfully. ID: ${serverResult._id || "ACK"}`);
      } else {
        alert(`Order Execution Rejected: ${serverResult.error || "Unknown Error"}`);
      }
    } catch (networkError) {
      console.error("Critical Transport Fault:", networkError);
      alert("Network Transport Fault: Check routing configuration or CORS origins.");
    }
  };

  return (
    // Universal Container: Y-Scroll on Mobile/Tablet, Locked on Laptop/TV
    <div className="flex flex-col lg:flex-row h-screen w-full bg-black text-zinc-100 font-sans antialiased overflow-y-auto lg:overflow-hidden">
      
      <Script 
        src="https://s3.tradingview.com/tv.js" 
        onLoad={initializeTradingViewWidget}
        strategy="afterInteractive"
      />

      {/* Pillar 1: Navigation (Top on Mobile, Left on Desktop) */}
      <aside className="w-full lg:w-16 h-16 lg:h-full shrink-0 flex flex-row lg:flex-col justify-between lg:justify-start items-center px-4 lg:px-0 lg:py-5 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-zinc-950 z-30 sticky top-0 lg:static">
        <div className="text-emerald-500 font-black text-2xl lg:text-xl lg:mb-10 tracking-tighter select-none cursor-default">PT</div>
        <div className="flex flex-row lg:flex-col gap-6 lg:gap-8 text-zinc-500">
          <button 
            onClick={() => alert("Advanced Charting is currently active.")}
            className="text-emerald-400 hover:text-white transition-colors cursor-pointer text-lg lg:text-base"
            title="Charts"
          >
            📊
          </button>
          <button 
            onClick={() => alert("Settings module is locked for standard users.")}
            className="hover:text-white transition-colors cursor-pointer text-lg lg:text-base"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
        <div className="lg:mt-auto cursor-pointer hover:scale-105 transition-transform" title="Profile Settings">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      {/* Pillar 2: Core Execution & Charting */}
      <main className="flex-1 flex flex-col w-full min-w-0 lg:border-r border-zinc-900">
        
        {/* Responsive Ticker Header */}
        <header className="h-16 shrink-0 border-b border-zinc-900 flex items-center justify-between px-4 lg:px-6 bg-zinc-950 z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap">BTC / USDT</h1>
            <span className="px-2 py-0.5 text-[10px] md:text-xs font-semibold bg-zinc-900 text-zinc-400 rounded border border-zinc-800 hidden sm:inline-block">SPOT</span>
          </div>
          <div className="flex items-center">
            <div className="flex flex-col items-end">
              <span className="text-[10px] md:text-xs font-medium text-zinc-500 tracking-wider uppercase">Live Index</span>
              <span className="text-base md:text-lg 2xl:text-xl font-mono font-bold text-emerald-400 tabular-nums">
                ${livePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </header>

        {/* Distributed Visualization Sandbox (Liquid Height) */}
        <div className="w-full h-[50vh] md:h-[65vh] lg:h-auto lg:flex-1 bg-black relative">
          <div id="advanced_tradingview_canvas" className="w-full h-full" />
        </div>

        {/* Analytical Ledger Compartment */}
        <div className="w-full h-auto lg:h-72 xl:h-80 shrink-0 border-t border-zinc-900 bg-zinc-950 flex flex-col z-10">
          <div className="flex border-b border-zinc-900 px-2 md:px-4 bg-zinc-950">
            <button 
              onClick={() => setActiveTab("positions")}
              className={`px-3 md:px-4 py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "positions" ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              Active Risk Positions (1)
            </button>
          </div>
          
          {/* Horizontally Scrollable Table for smaller screens */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-2 md:p-4 font-mono text-[10px] md:text-xs">
            {activeTab === "positions" && (
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-zinc-600 uppercase tracking-wider border-b border-zinc-900">
                    <th className="pb-3 font-medium px-2">Asset Pair</th>
                    <th className="pb-3 font-medium px-2">Position Side</th>
                    <th className="pb-3 font-medium px-2">Notional Size</th>
                    <th className="pb-3 font-medium px-2">Entry Baseline</th>
                    <th className="pb-3 font-medium text-right px-2">Unrealized PnL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td className="py-4 font-bold text-white px-2">BTC/USDT</td>
                    <td className="py-4 text-emerald-400 font-bold px-2">LONG</td>
                    <td className="py-4 text-zinc-300 px-2">0.50 BTC</td>
                    <td className="py-4 text-zinc-400 px-2">$63,100.00</td>
                    <td className="py-4 text-right text-emerald-400 font-bold tabular-nums px-2">
                      +${((livePrice - 63100) * 0.5).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Pillar 3: Order Management Terminal (Scales to w-96 on 4K/TVs) */}
      <aside className="w-full lg:w-80 2xl:w-96 shrink-0 bg-zinc-950 p-4 md:p-6 lg:p-4 flex flex-col z-20 border-t lg:border-t-0 border-zinc-900">
        <h2 className="text-xs md:text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4">Execution Core</h2>
        
        <div className="flex-1 bg-zinc-900/40 rounded-xl border border-zinc-900 p-4 md:p-6 lg:p-4 flex flex-col">
          
          {/* Order Type Router */}
          <div className="grid grid-cols-2 bg-black rounded-lg p-1 border border-zinc-900 mb-6 lg:mb-8">
            <button 
              onClick={() => setOrderType("Market")}
              className={`py-2 lg:py-1.5 text-xs md:text-sm lg:text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${orderType === "Market" ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Market
            </button>
            <button 
              onClick={() => setOrderType("Limit")}
              className={`py-2 lg:py-1.5 text-xs md:text-sm lg:text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${orderType === "Limit" ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Limit
            </button>
          </div>

          {/* Configuration Parameters */}
          <div className="space-y-6 lg:space-y-5 mb-auto">
            <div className="space-y-2 lg:space-y-1.5">
              <label className="text-[10px] md:text-xs lg:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order Capacity (BTC)</label>
              <div className="relative rounded-lg bg-black border border-zinc-900 focus-within:border-emerald-500/50 transition-all">
                <input 
                  type="number" 
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-transparent px-4 py-3 md:py-4 lg:py-2.5 text-base lg:text-sm text-white font-mono focus:outline-none"
                />
              </div>
            </div>
            
            {orderType === "Limit" && (
              <div className="space-y-2 lg:space-y-1.5">
                <label className="text-[10px] md:text-xs lg:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Bound Rate (USD)</label>
                <div className="relative rounded-lg bg-black border border-zinc-900 focus-within:border-emerald-500/50 transition-all">
                  <input 
                    type="number" 
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-transparent px-4 py-3 md:py-4 lg:py-2.5 text-base lg:text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Asynchronous Execution Trigger */}
          <div className="flex gap-3 md:gap-4 lg:gap-3 mt-8 lg:mt-6">
            <button 
              onClick={() => executeOrderPipeline("BUY")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 cursor-pointer active:scale-[0.98] text-white py-4 md:py-5 lg:py-3 rounded-lg text-xs md:text-sm lg:text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-950/20"
            >
              Acquire / Long
            </button>
            <button 
              onClick={() => executeOrderPipeline("SELL")}
              className="flex-1 bg-red-600 hover:bg-red-500 cursor-pointer active:scale-[0.98] text-white py-4 md:py-5 lg:py-3 rounded-lg text-xs md:text-sm lg:text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-950/20"
            >
              Liquidate / Short
            </button>
          </div>

        </div>
      </aside>
    </div>
  );
}