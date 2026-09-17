"use client";

import React, { useState, useEffect, useRef } from "react";
import { Employee, ChatMessage, ChatChannel } from "@/lib/types";
import {
  MessageSquare,
  Hash,
  User,
  Users,
  Send,
  Search,
  Plus,
  Bell,
  Check,
  CheckCheck,
  Circle,
  Clock,
  Sparkles,
  Shield,
  Smile,
  RefreshCw,
  X,
} from "lucide-react";

interface TeamChatSectionProps {
  currentUser: {
    id: string; // e.g. "admin" or employee.id
    name: string;
    role: "admin" | "employee";
    designation?: string;
    avatarUrl?: string;
  };
}

export default function TeamChatSection({ currentUser }: TeamChatSectionProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Active chat: either channelId or recipientId (DM)
  const [activeType, setActiveType] = useState<"channel" | "dm">("channel");
  const [activeId, setActiveId] = useState<string>("general"); // default general channel

  // Composer
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Channel Modal
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch Channels & Employees
  const fetchMeta = async () => {
    try {
      const [chanRes, empRes] = await Promise.all([
        fetch("/api/chat/channels"),
        fetch("/api/employees"),
      ]);
      const chanData = await chanRes.json();
      const empData = await empRes.json();

      if (chanData.success) {
        setChannels(chanData.channels || []);
      }
      if (empData.success) {
        let empList: Employee[] = empData.employees || [];
        try {
          const raw = localStorage.getItem("byt_deleted_emp_ids");
          if (raw) {
            const deletedIds: string[] = JSON.parse(raw);
            empList = empList.filter(
              (e) => !deletedIds.includes(e.id) && !deletedIds.includes(e.empId)
            );
          }
        } catch (e) {
          // ignore
        }
        setEmployees(empList);
      }
    } catch (err) {
      console.error("Failed to load chat meta:", err);
    }
  };

  // Fetch Messages for current active conversation
  const fetchMessages = async () => {
    try {
      let url = "/api/chat?";
      if (activeType === "channel") {
        url += `channelId=${activeId}`;
      } else {
        url += `userId=${currentUser.id}&otherUserId=${activeId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }

      // Also refresh unread counts
      const unreadRes = await fetch(`/api/chat?userId=${currentUser.id}&countOnly=true`);
      const unreadData = await unreadRes.json();
      if (unreadData.success) {
        setTotalUnread(unreadData.totalUnread || 0);
        setUnreadMap(unreadData.bySender || {});
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  // Mark as read when active conversation opens or updates
  const markActiveAsRead = async () => {
    try {
      await fetch("/api/chat/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          channelId: activeType === "channel" ? activeId : undefined,
          senderId: activeType === "dm" ? activeId : undefined,
        }),
      });
      // Clear from unreadMap locally
      if (activeType === "dm") {
        setUnreadMap((prev) => {
          const next = { ...prev };
          delete next[activeId];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  // Fetch when active chat changes
  useEffect(() => {
    fetchMessages();
    markActiveAsRead();
  }, [activeType, activeId]);

  // Auto scroll down when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Periodic polling for real-time messages (every 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeType, activeId, currentUser.id]);

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      const payload: any = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderDesignation: currentUser.designation || (currentUser.role === "admin" ? "HR Admin" : "Employee"),
        text: content,
        content: content,
      };

      if (activeType === "channel") {
        payload.channelId = activeId;
      } else {
        payload.recipientId = activeId;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setInputText("");
        const newMsg = data.chatMessage || data.message;
        if (newMsg) {
          setMessages((prev) => [...prev, newMsg]);
        }
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Create Channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDesc.trim(),
          createdBy: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChannels((prev) => [...prev, data.channel]);
        setActiveType("channel");
        setActiveId(data.channel.id);
        setShowCreateChannel(false);
        setNewChannelName("");
        setNewChannelDesc("");
      }
    } catch (err) {
      console.error("Create channel error:", err);
    }
  };

  // Filter contacts by search query
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.id !== currentUser.id &&
      (emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredChannels = channels.filter(
    (ch) =>
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get active conversation metadata
  const activeChannel = channels.find((c) => c.id === activeId);
  const activeEmp = employees.find((e) => e.id === activeId);
  const isDMWithAdmin = activeType === "dm" && activeId === "admin";

  return (
    <div className="bg-white rounded-3xl border border-[#DDEAE2] shadow-by overflow-hidden flex flex-col md:flex-row h-[750px]">
      {/* ========================================================================= */}
      {/* SIDEBAR: CHANNELS & DIRECT MESSAGES */}
      {/* ========================================================================= */}
      <div className="w-full md:w-80 bg-[#162E3D] text-white flex flex-col border-r border-[#244254] flex-shrink-0">
        {/* Header with Unread Counter */}
        <div className="p-4 border-b border-[#244254] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#45C512] text-[#162E3D] flex items-center justify-center font-bold shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif text-white tracking-wide">
                Team Connect
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-[#A89898]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>All Agency Members</span>
              </div>
            </div>
          </div>

          {totalUnread > 0 && (
            <span className="flex items-center gap-1 bg-[#45C512] text-[#162E3D] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              <Bell className="w-3 h-3" />
              {totalUnread} new
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[#244254]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A89898] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats, staff, channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0f1f2a] border border-[#244254] rounded-xl text-white placeholder-[#A89898] focus:outline-none focus:border-[#45C512]"
            />
          </div>
        </div>

        {/* Channels & DMs Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* GROUP CHANNELS SECTION */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89898]">
                Team Channels ({filteredChannels.length})
              </span>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="text-[#45C512] hover:text-[#5fe02b] p-1 rounded hover:bg-white/10"
                title="Create New Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {filteredChannels.map((channel) => {
                const isActive = activeType === "channel" && activeId === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveType("channel");
                      setActiveId(channel.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#45C512] text-[#162E3D] font-bold shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-[#162E3D]" : "text-[#45C512]"}`} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIRECT MESSAGES SECTION */}
          <div>
            <div className="px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89898]">
                Direct Messages ({filteredEmployees.length + (currentUser.role === "employee" ? 1 : 0)})
              </span>
            </div>

            <div className="space-y-1">
              {/* If employee, show HR Admin DM item */}
              {currentUser.role === "employee" && (
                <button
                  onClick={() => {
                    setActiveType("dm");
                    setActiveId("admin");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeType === "dm" && activeId === "admin"
                      ? "bg-[#45C512] text-[#162E3D] font-bold shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-6 h-6 rounded-full bg-[#45C512] text-[#162E3D] flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      HR
                    </div>
                    <div className="truncate">
                      <div className="font-bold truncate flex items-center gap-1">
                        <span>HR Administration</span>
                        <Shield className="w-2.5 h-2.5 text-amber-300" />
                      </div>
                      <div className="text-[10px] opacity-75 truncate">Official Support</div>
                    </div>
                  </div>

                  {unreadMap["admin"] ? (
                    <span className="bg-[#45C512] text-[#162E3D] font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                      {unreadMap["admin"]}
                    </span>
                  ) : null}
                </button>
              )}

              {/* All Employees for DM */}
              {filteredEmployees.map((emp) => {
                const isActive = activeType === "dm" && activeId === emp.id;
                const unreadCount = unreadMap[emp.id] || 0;

                return (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setActiveType("dm");
                      setActiveId(emp.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#45C512] text-[#162E3D] font-bold shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={
                            emp.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.name)}&backgroundColor=331e1e&textColor=a2fc4b`
                          }
                          alt={emp.name}
                          className="w-7 h-7 rounded-full object-cover border border-white/20"
                        />
                        <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 border border-[#162E3D]"></span>
                      </div>
                      <div className="truncate min-w-0">
                        <div className="font-bold truncate flex items-center gap-1">
                          <span>{emp.name}</span>
                          <span className={`text-[9px] font-mono px-1 rounded ${isActive ? "bg-[#162E3D]/20 text-[#162E3D]" : "bg-white/10 text-[#A89898]"}`}>
                            {emp.empId}
                          </span>
                        </div>
                        <div className={`text-[10px] truncate ${isActive ? "text-[#162E3D]/80" : "text-[#A89898]"}`}>
                          {emp.designation}
                        </div>
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="bg-[#45C512] text-[#162E3D] font-bold text-[10px] px-1.5 py-0.2 rounded-full ml-1 flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current User Quick Badge Footer */}
        <div className="p-3 border-t border-[#244254] bg-[#0f1f2a] flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-[#45C512] text-[#162E3D] font-bold flex items-center justify-center text-xs flex-shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-[#45C512] truncate">
                {currentUser.designation || (currentUser.role === "admin" ? "HR Admin" : "Employee")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CHAT AREA */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-[#F5F9F7] h-full overflow-hidden">
        {/* Active Conversation Header */}
        <div className="p-4 bg-white border-b border-[#DDEAE2] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {activeType === "channel" ? (
              <div className="w-10 h-10 rounded-2xl bg-[#162E3D] text-[#45C512] flex items-center justify-center shadow-sm">
                <Hash className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#162E3D] text-[#45C512] flex items-center justify-center shadow-sm">
                {isDMWithAdmin ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#162E3D]">
                  {activeType === "channel"
                    ? `#${activeChannel?.name || activeId}`
                    : isDMWithAdmin
                    ? "HR Administration Support"
                    : activeEmp?.name || "Direct Message"}
                </h3>
                {activeType === "channel" ? (
                  <span className="text-[10px] bg-[#EEFCD9] text-[#244704] font-bold px-2 py-0.5 rounded-full">
                    Group Channel
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#162E3D] text-[#45C512] font-bold px-2 py-0.5 rounded-full">
                    {isDMWithAdmin ? "Official" : activeEmp?.designation}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#706161]">
                {activeType === "channel"
                  ? activeChannel?.description || "Team discussion channel"
                  : isDMWithAdmin
                  ? "Direct private channel with HR Admin"
                  : `${activeEmp?.empId} &bull; ${activeEmp?.department}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMessages}
              title="Refresh messages"
              className="p-2 text-[#706161] hover:text-[#162E3D] hover:bg-[#F5F9F7] rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#706161]">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDEAE2] flex items-center justify-center mb-3 shadow-sm text-[#162E3D]">
                <MessageSquare className="w-7 h-7 text-[#45C512]" />
              </div>
              <h4 className="text-sm font-bold text-[#162E3D]">No messages yet</h4>
              <p className="text-xs max-w-sm mt-1">
                Start the conversation with{" "}
                <span className="font-bold text-[#162E3D]">
                  {activeType === "channel" ? `#${activeChannel?.name || activeId}` : activeEmp?.name || "this colleague"}
                </span>
                .
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {!isMine && (
                    <div className="w-8 h-8 rounded-full bg-[#162E3D] text-[#45C512] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                      {msg.senderName.charAt(0)}
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm space-y-1 ${
                      isMine
                        ? "bg-[#162E3D] text-white rounded-tr-xs"
                        : "bg-white text-[#162E3D] border border-[#DDEAE2] rounded-tl-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={isMine ? "text-[#45C512]" : "text-[#162E3D]"}>
                          {isMine ? "You" : msg.senderName}
                        </span>
                        {msg.senderDesignation && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${
                              isMine ? "bg-white/10 text-white/80" : "bg-[#F5F9F7] text-[#706161]"
                            }`}
                          >
                            {msg.senderDesignation}
                          </span>
                        )}
                      </div>
                      <span className={isMine ? "text-[#A89898]" : "text-[#706161]"}>
                        {new Date(msg.timestamp || msg.createdAt || Date.now()).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {msg.text || msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Composer */}
        <div className="p-4 bg-white border-t border-[#DDEAE2]">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Message ${activeType === "channel" ? `#${activeChannel?.name || activeId}` : activeEmp?.name || "colleague"}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-3 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-medium text-[#162E3D]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                inputText.trim() && !isSending
                  ? "bg-[#162E3D] text-[#45C512] hover:bg-[#244254] shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* CREATE CHANNEL MODAL */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#DDEAE2] shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
            <div className="bg-[#162E3D] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Hash className="w-5 h-5 text-[#45C512]" />
                <h3 className="text-base font-bold font-serif text-white">
                  Create New Group Channel
                </h3>
              </div>
              <button
                onClick={() => setShowCreateChannel(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#162E3D] block mb-1">
                  Channel Name:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. client-updates, design-reviews..."
                    value={newChannelName}
                    onChange={(e) =>
                      setNewChannelName(
                        e.target.value.toLowerCase().replace(/\s+/g, "-")
                      )
                    }
                    className="w-full pl-7 pr-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#162E3D] block mb-1">
                  Description / Topic:
                </label>
                <input
                  type="text"
                  placeholder="What is this channel about?"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F5F9F7] border border-[#DDEAE2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C512]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDEAE2]">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 bg-[#F5F9F7] text-[#162E3D] text-xs font-bold rounded-xl hover:bg-[#DDEAE2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim()}
                  className="px-5 py-2 bg-[#162E3D] text-[#45C512] text-xs font-bold rounded-xl hover:bg-[#244254] shadow-md cursor-pointer"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
