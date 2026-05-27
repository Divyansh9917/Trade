"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const targetApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function CommunityPage() {
  const { user } = useUser();

  // --- BLOG CMS STATE ---
  const [posts, setPosts] = useState([]);
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [newPostData, setNewPostData] = useState({ title: "", content: "", tag: "ANALYSIS" });
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch Blogs on Load
  useEffect(() => {
    fetchPosts();
  }, []);

  // Fetch Logic
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${targetApiUrl}/api/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  };

  // Publish Logic with Smart Error Handling
  const handlePublishPost = async () => {
    if (!newPostData.title || !newPostData.content) return alert("Title and Content are required!");
    if (!user) return alert("Please sign in to publish.");

    setIsPublishing(true);
    try {
      // 💡 Smart Fallback: Extract name from email if profile name is missing
      const userEmail = user?.primaryEmailAddress?.emailAddress || "";
      const emailPrefix = userEmail.split('@')[0];

      const payload = {
        title: newPostData.title,
        content: newPostData.content,
        tag: newPostData.tag,
        authorName: user?.fullName || user?.firstName || user?.username || emailPrefix || "Anonymous Trader",
        authorEmail: userEmail || "trader@proptrado.local"
      };

      const res = await fetch(`${targetApiUrl}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewPostData({ title: "", content: "", tag: "ANALYSIS" }); // Reset form
        setIsWritingModalOpen(false); // Close modal
        fetchPosts(); // Refresh feed instantly
      } else {
        const errorData = await res.json().catch(() => ({ error: "Server returned non-JSON format" }));
        alert(`Server Rejected: ${errorData.error || `HTTP ${res.status}`}`);
        console.error("Full Backend Rejection Data:", errorData);
      }
    } catch (error) {
      console.error("Publish Error:", error);
      alert("Network Error: Backend unreachable. Is nodemon running?");
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete Logic
  const handleDeletePost = async (postId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this analysis?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${targetApiUrl}/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPosts(); // Refresh feed instantly after deletion
      } else {
        alert("Failed to delete the post. It might have already been removed.");
      }
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Network Error while trying to delete.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-black text-zinc-100 font-sans antialiased relative">
      
      {/* WRITE POST MODAL */}
      {isWritingModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
              <h2 className="text-xl font-bold text-white">Draft New Analysis</h2>
              <button onClick={() => setIsWritingModalOpen(false)} className="text-zinc-500 hover:text-white font-bold text-xl cursor-pointer">×</button>
            </div>
            
            <input 
              type="text" 
              placeholder="Post Title (e.g., BTC Breakout Target)" 
              value={newPostData.title}
              onChange={(e) => setNewPostData({...newPostData, title: e.target.value})}
              className="bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            />
            
            <div className="flex gap-4">
              <select 
                value={newPostData.tag}
                onChange={(e) => setNewPostData({...newPostData, tag: e.target.value})}
                className="bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="ANALYSIS">#ANALYSIS</option>
                <option value="JOURNEY">#JOURNEY</option>
                <option value="ALERT">#ALERT</option>
                <option value="STRATEGY">#STRATEGY</option>
              </select>
            </div>

            <textarea 
              placeholder="Write your market insights here..." 
              value={newPostData.content}
              onChange={(e) => setNewPostData({...newPostData, content: e.target.value})}
              className="bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 h-48 resize-none"
            />
            
            <div className="flex justify-end pt-2">
              <button 
                onClick={handlePublishPost}
                disabled={isPublishing}
                className={`bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              >
                {isPublishing ? "Publishing..." : "Publish Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-16 h-16 lg:h-full shrink-0 flex flex-row lg:flex-col justify-between lg:justify-start items-center px-4 lg:px-0 lg:py-5 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-zinc-950 z-30 sticky top-0 lg:static">
        <div className="text-emerald-500 font-black text-2xl lg:text-xl lg:mb-10 tracking-tighter select-none cursor-default">PT</div>
        <div className="flex flex-row lg:flex-col gap-6 lg:gap-8 text-zinc-500">
          <Link href="/trade" title="Trading Terminal" className="hover:text-white transition-colors cursor-pointer text-lg lg:text-base">📈</Link>
          <Link href="/community" title="Community & Blogs" className="text-emerald-400 hover:text-white transition-colors cursor-pointer text-lg lg:text-base">📝</Link>
        </div>
        <div className="lg:mt-auto cursor-pointer hover:scale-105 transition-transform">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      {/* FULL WIDTH COLUMN: Dynamic Blogs & Analysis */}
      <main className="flex-1 h-screen overflow-y-auto bg-black relative flex flex-col">
        <header className="h-16 shrink-0 border-b border-zinc-900 flex items-center justify-between px-6 lg:px-12 bg-zinc-950 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">Community Research & Analysis</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 hidden sm:inline-block">LIVE FEED</span>
          </div>
          <button 
            onClick={() => setIsWritingModalOpen(true)}
            className="bg-white text-black hover:bg-zinc-200 cursor-pointer active:scale-95 px-5 py-2 rounded-md text-xs font-bold transition-all shadow-lg"
          >
            + Write Post
          </button>
        </header>

        <div className="p-6 lg:p-12 max-w-5xl mx-auto w-full space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article key={post._id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 lg:p-8 hover:border-zinc-700 transition-colors shadow-xl shadow-black/50">
                
                {/* DYNAMIC HEADER WITH DELETE BUTTON */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">{post.title}</h3>
                    <p className="text-sm text-zinc-400">
                      Written by <span className="text-emerald-400 font-medium">{post.authorName}</span> • {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Right Side: Tag & Conditional Delete Button */}
                  <div className="flex flex-col items-end gap-3">
                    <span className="px-3 py-1 bg-zinc-900 text-zinc-300 text-xs font-bold rounded-md border border-zinc-800">
                      #{post.tag}
                    </span>
                    
                    {/* Only show Delete if emails match */}
                    {user?.primaryEmailAddress?.emailAddress === post.authorEmail && (
                      <button 
                        onClick={() => handleDeletePost(post._id)}
                        className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:text-white hover:bg-red-600 px-2 py-1 rounded transition-colors cursor-pointer border border-transparent hover:border-red-500"
                      >
                        Delete Post
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-zinc-300 text-sm lg:text-base leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>
              </article>
            ))
          ) : (
            <div className="text-center py-32 text-zinc-500 flex flex-col items-center justify-center">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-xl font-bold text-zinc-300 mb-2">No analysis posted yet.</p>
              <p className="text-sm">Be the first to share your market insights with the community!</p>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}