import { NextRequest, NextResponse } from "next/server";
import {
  getChatMessages,
  saveChatMessage,
  getUnreadChatCount,
} from "@/lib/db";

// GET: Retrieve messages & unread counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId") || undefined;
    const currentUserId = searchParams.get("currentUserId") || searchParams.get("userId") || undefined;
    const otherUserId = searchParams.get("otherUserId") || undefined;
    const dmUser1 = searchParams.get("dmUser1") || currentUserId;
    const dmUser2 = searchParams.get("dmUser2") || otherUserId;

    const messages = getChatMessages({
      channelId,
      dmUser1,
      dmUser2,
    });

    let unread = { total: 0, channels: {}, dms: {} };
    if (currentUserId) {
      unread = getUnreadChatCount(currentUserId);
    }

    return NextResponse.json({
      success: true,
      messages,
      unread,
      totalUnread: unread.total,
      bySender: unread.dms,
    });
  } catch (error) {
    console.error("GET chat messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load chat messages" },
      { status: 500 }
    );
  }
}

// POST: Send new message (Group or DM)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderId,
      senderName,
      senderEmpId,
      senderDesignation,
      senderRole,
      channelId,
      recipientId,
    } = body;
    const messageText = (body.text || body.content || "").trim();

    if (!senderId || !senderName || !messageText || (!channelId && !recipientId)) {
      return NextResponse.json(
        { success: false, error: "Missing required message parameters" },
        { status: 400 }
      );
    }

    const newMsg = saveChatMessage({
      senderId,
      senderName,
      senderEmpId,
      senderDesignation,
      senderRole,
      channelId,
      recipientId,
      text: messageText,
      content: messageText,
    });

    return NextResponse.json(
      { success: true, message: newMsg, chatMessage: newMsg },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST chat message error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to post message" },
      { status: 500 }
    );
  }
}
