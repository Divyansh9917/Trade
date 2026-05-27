"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Script from "next/script";
import Link from "next/link";

export default function TradeTerminal() {
  const { user } = useUser();
  const [orderType, setOrderType] = useState("Market");
  const [tradeProduct, setTradeProduct] = useState("Delivery"); // Intraday vs Delivery
  const [quantity, setQuantity] = useState("1.00");
  const [limitPrice, setLimitPrice] = useState("64231.50");
  const [livePrice, setLivePrice] = useState(64231.50);
  const [activeTab, setActiveTab] = useState("positions"); // "positions" or "history"
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 💡 NEW STATE: Full Screen Chart Toggle
  const [isChartFullScreen, setIsChartFullScreen] = useState(false);

  // State for Ledger & Positions
  const [tradeHistory, setTradeHistory] = useState([]);
  const [netPosition, setNetPosition] = useState(0);
  const [avgEntryPrice, setAvgEntryPrice] = useState(0);

  const targetApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  // 1. Fetch Trade History from Backend
  const fetchTradeLedger = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${targetApiUrl}/api/trades/${user.primaryEmailAddress.emailAddress}`);
      if (response.ok) {
        const data = await response.json();
        setTradeHistory(data);
        
        let totalQty = 0;
        let totalCost = 0;
        
        [...data].reverse().forEach(trade => {
          const qty = parseFloat(trade.quantity) || 0;
          const price = parseFloat(trade.price) || 0;

          if (trade.side === "BUY") {
            const previousQty = totalQty;
            totalQty += qty;
            totalCost += (qty * price);
          } else if (trade.side === "SELL") {
            const previousQty = totalQty;
            totalQty -= qty;
            
            if (previousQty > 0) {
              const averageCostAtTimeOfSale = totalCost / previousQty;
              totalCost -= (qty * averageCostAtTimeOfSale);
            }
          }

          if (Math.abs(totalQty) < 0.0001) {
            totalQty = 0;
            totalCost = 0;
          }
        });
        
        setNetPosition(totalQty);
        setAvgEntryPrice(totalQty > 0 ? (totalCost / totalQty) : 0);
      }
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    }
  };

  // 2. Real-time market streaming & initial fetch
  useEffect(() => {
    fetchTradeLedger(); 

    const wsUrl = "wss://stream.binance.com:9443/ws/btcusdt@ticker";
    const marketSocket = new WebSocket(wsUrl);
    marketSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.c) setLivePrice(parseFloat(data.c));
      } catch (err) {}
    };
    return () => marketSocket.close();
  }, [user]);

  const initializeTradingViewWidget = () => {
    if (typeof window !== "undefined" && window.TradingView) {
      new window.TradingView.widget({
        autosize: true, symbol: "BINANCE:BTCUSDT", interval: "1", timezone: "Etc/UTC",
        theme: "dark", style: "1", locale: "en", enable_publishing: false,
        hide_side_toolbar: false, allow_symbol_change: true,
        container_id: "advanced_tradingview_canvas",
        studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
        loading_screen: { backgroundColor: "#000000" }
      });
    }
  };

  // 3. Execution Engine with Risk Management
  const executeOrderPipeline = async (side) => {
    if (!user) return alert("System state error: Authenticating session...");
    
    const parsedQuantity = parseFloat(quantity);
    if (parsedQuantity <= 0 || isNaN(parsedQuantity)) return alert("Invalid quantity.");

    if (side === "SELL" && tradeProduct === "Delivery") {
      if (parsedQuantity > netPosition) {
        return alert(`Risk RMS Alert: Insufficient Holdings. You have ${netPosition.toFixed(4)} BTC, but trying to sell ${parsedQuantity} BTC in Delivery.`);
      }
    }
    
    setIsProcessing(true);

    const executionPayload = {
      userEmail: user.primaryEmailAddress.emailAddress,
      symbol: "BTC/USDT",
      side: side,
      orderType: orderType,
      quantity: parsedQuantity,
      price: orderType === "Market" ? livePrice : parseFloat(limitPrice),
      timestamp: Date.now()
    };

    try {
      const response = await fetch(`${targetApiUrl}/api/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executionPayload)
      });

      const serverResult = await response.json();
      setIsProcessing(false);

      if (response.ok) {
        fetchTradeLedger(); 
        alert(`Order Executed. ID: ${serverResult._id.slice(-6).toUpperCase()}`);
      } else {
        alert(`Order Rejected: ${serverResult.error}`);
      }
    } catch (networkError) {
      setIsProcessing(false);
      alert("Network Transport Fault. API Unreachable.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-black text-zinc-100 font-sans antialiased overflow-y-auto lg:overflow-hidden">
      <Script src="https://s3.tradingview.com/tv.js" onLoad={initializeTradingViewWidget} strategy="afterInteractive" />

      <aside className="w-full lg:w-16 h-16 lg:h-full shrink-0 flex flex-row lg:flex-col justify-between lg:justify-start items-center px-4 lg:px-0 lg:py-5 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-zinc-950 z-30 sticky top-0 lg:static">
        <div className="text-emerald-500 font-black text-2xl lg:text-xl lg:mb-10 tracking-tighter select-none cursor-default">PT</div>
        <div className="flex flex-row lg:flex-col gap-6 lg:gap-8 text-zinc-500">
          <Link href="/trade" title="Trading Terminal" className="text-emerald-400 hover:text-white transition-colors cursor-pointer text-lg lg:text-base">📊</Link>
          <Link href="/community" title="Community & Blogs" className="hover:text-white transition-colors cursor-pointer text-lg lg:text-base">📝</Link>
          <button title="Settings" className="hover:text-white transition-colors cursor-pointer text-lg lg:text-base">⚙️</button>
        </div>
        <div className="lg:mt-auto cursor-pointer hover:scale-105 transition-transform"><UserButton afterSignOutUrl="/sign-in" /></div>
      </aside>

      <main className="flex-1 flex flex-col w-full min-w-0 lg:border-r border-zinc-900">
        <header className="h-16 shrink-0 border-b border-zinc-900 flex items-center justify-between px-4 lg:px-6 bg-zinc-950 z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap">BTC / USDT</h1>
            <span className="px-2 py-0.5 text-[10px] md:text-xs font-semibold bg-zinc-900 text-zinc-400 rounded border border-zinc-800 hidden sm:inline-block">SPOT</span>
            
            {/* 🚀 EXPAND CHART BUTTON */}
            <button 
              onClick={() => setIsChartFullScreen(true)}
              className="ml-2 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800 transition-colors text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Full Screen Chart"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
              <span className="hidden md:inline font-bold tracking-wider">EXPAND</span>
            </button>

          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] md:text-xs font-medium text-zinc-500 tracking-wider uppercase">Live Index</span>
            <span className="text-base md:text-lg 2xl:text-xl font-mono font-bold text-emerald-400 tabular-nums">
              ${livePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </header>

        {/* 🚀 DYNAMIC CHART CONTAINER (Handles Fullscreen Pop-out) */}
        <div className={isChartFullScreen ? "fixed inset-0 z-[100] bg-black" : "w-full h-[45vh] md:h-[55vh] lg:h-auto lg:flex-1 bg-black relative"}>
          
          {/* EXIT FULLSCREEN OVERLAY BUTTON */}
          {isChartFullScreen && (
            <button 
              onClick={() => setIsChartFullScreen(false)}
              className="absolute top-4 right-4 z-[110] bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-emerald-500 text-white px-4 py-2 rounded-lg shadow-2xl backdrop-blur text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="uppercase tracking-wider">Exit Fullscreen</span>
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          )}

          <div id="advanced_tradingview_canvas" className="w-full h-full" />
        </div>

        {/* Dynamic Ledger & Positions Panel */}
        <div className="w-full h-auto lg:h-72 xl:h-80 shrink-0 border-t border-zinc-900 bg-zinc-950 flex flex-col z-10">
          <div className="flex border-b border-zinc-900 px-2 md:px-4 bg-zinc-950 gap-4">
            <button 
              onClick={() => setActiveTab("positions")}
              className={`py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "positions" ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              Active Risk Positions
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "history" ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              Order Ledger History
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto overflow-y-auto p-2 md:p-4 font-mono text-[10px] md:text-xs">
            {/* POSITIONS TAB */}
            {activeTab === "positions" && (
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-zinc-600 uppercase tracking-wider border-b border-zinc-900">
                    <th className="pb-3 font-medium px-2">Asset Pair</th>
                    <th className="pb-3 font-medium px-2">Net Position</th>
                    <th className="pb-3 font-medium px-2">Avg Entry Price</th>
                    <th className="pb-3 font-medium text-right px-2">Unrealized PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {netPosition > 0 ? (
                    <tr className="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                      <td className="py-4 font-bold text-white px-2">BTC/USDT</td>
                      <td className="py-4 text-emerald-400 font-bold px-2">{netPosition.toFixed(4)} BTC</td>
                      <td className="py-4 text-zinc-400 px-2">${avgEntryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className={`py-4 text-right font-bold tabular-nums px-2 ${livePrice >= avgEntryPrice ? 'text-emerald-400' : 'text-red-400'}`}>
                        {livePrice >= avgEntryPrice ? '+' : '-'}${Math.abs((livePrice - avgEntryPrice) * netPosition).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ) : (
                    <tr><td colSpan="4" className="py-8 text-center text-zinc-600 italic">No active holdings in inventory.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-zinc-600 uppercase tracking-wider border-b border-zinc-900">
                    <th className="pb-3 font-medium px-2">Time</th>
                    <th className="pb-3 font-medium px-2">Type</th>
                    <th className="pb-3 font-medium px-2">Side</th>
                    <th className="pb-3 font-medium px-2">Size (BTC)</th>
                    <th className="pb-3 font-medium text-right px-2">Exec Price</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.length > 0 ? tradeHistory.map((trade, idx) => (
                    <tr key={idx} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                      <td className="py-3 text-zinc-400 px-2">{new Date(trade.createdAt).toLocaleTimeString()}</td>
                      <td className="py-3 text-zinc-300 px-2">{trade.orderType || "MARKET"}</td>
                      <td className={`py-3 font-bold px-2 ${trade.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{trade.side}</td>
                      <td className="py-3 text-zinc-300 px-2">{trade.quantity}</td>
                      <td className="py-3 text-right text-white font-mono px-2">${trade.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="py-8 text-center text-zinc-600 italic">No previous trades found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <aside className="w-full lg:w-80 2xl:w-96 shrink-0 bg-zinc-950 p-4 md:p-6 lg:p-4 flex flex-col z-20 border-t lg:border-t-0 border-zinc-900">
        <h2 className="text-xs md:text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4">Execution Core</h2>
        
        <div className="flex-1 bg-zinc-900/40 rounded-xl border border-zinc-900 p-4 md:p-6 lg:p-4 flex flex-col">
          
          <div className="grid grid-cols-2 bg-black rounded-lg p-1 border border-zinc-900 mb-4">
            <button onClick={() => setTradeProduct("Delivery")} className={`py-1 text-[10px] md:text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${tradeProduct === "Delivery" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-400"}`}>
              Delivery (CNC)
            </button>
            <button onClick={() => setTradeProduct("Intraday")} className={`py-1 text-[10px] md:text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${tradeProduct === "Intraday" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-400"}`}>
              Intraday (MIS)
            </button>
          </div>

          <div className="grid grid-cols-2 bg-black rounded-lg p-1 border border-zinc-900 mb-6 lg:mb-8">
            <button onClick={() => setOrderType("Market")} className={`py-2 lg:py-1.5 text-xs lg:text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${orderType === "Market" ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"}`}>Market</button>
            <button onClick={() => setOrderType("Limit")} className={`py-2 lg:py-1.5 text-xs lg:text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${orderType === "Limit" ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"}`}>Limit</button>
          </div>

          <div className="space-y-6 lg:space-y-5 mb-auto">
            <div className="space-y-2 lg:space-y-1.5">
              <label className="text-[10px] md:text-xs lg:text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                <span>Order Capacity (BTC)</span>
                {tradeProduct === "Delivery" && <span className="text-emerald-500">Holdings: {netPosition.toFixed(2)}</span>}
              </label>
              <div className="relative rounded-lg bg-black border border-zinc-900 focus-within:border-emerald-500/50 transition-all">
                <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-transparent px-4 py-3 lg:py-2.5 text-base lg:text-sm text-white font-mono focus:outline-none"/>
              </div>
            </div>
            
            {orderType === "Limit" && (
              <div className="space-y-2 lg:space-y-1.5">
                <label className="text-[10px] md:text-xs lg:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Bound Rate (USD)</label>
                <div className="relative rounded-lg bg-black border border-zinc-900 focus-within:border-emerald-500/50 transition-all">
                  <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="w-full bg-transparent px-4 py-3 lg:py-2.5 text-base lg:text-sm text-white font-mono focus:outline-none"/>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-8 lg:mt-6">
            <button onClick={() => executeOrderPipeline("BUY")} disabled={isProcessing} className={`flex-1 ${isProcessing ? 'bg-zinc-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer active:scale-[0.98] shadow-lg shadow-emerald-950/20'} text-white py-4 lg:py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all`}>
              {isProcessing ? "..." : "BUY"}
            </button>
            <button onClick={() => executeOrderPipeline("SELL")} disabled={isProcessing} className={`flex-1 ${isProcessing ? 'bg-zinc-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 cursor-pointer active:scale-[0.98] shadow-lg shadow-red-950/20'} text-white py-4 lg:py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all`}>
              {isProcessing ? "..." : "SELL"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}