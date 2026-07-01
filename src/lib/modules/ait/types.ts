export type AitMessageType = "operation" | "strategy" | "discussion";

export type AitSignal = {
  id: string;
  authorId: string | null;
  authorName: string;
  messageType: AitMessageType;
  market: string;
  symbol: string | null;
  side: string | null;
  title: string | null;
  content: string;
  tags: string[];
  qualityScore: number | null;
  replyCount: number;
  source: "wallpilot" | "ai-trader";
  createdAt: string;
};

export type AitSignalReply = {
  id: string;
  signalId: string;
  authorId: string | null;
  authorName: string;
  content: string;
  accepted: boolean;
  createdAt: string;
};

export type AitFeedResponse = {
  signals: AitSignal[];
  total: number;
  source: "wallpilot" | "ai-trader";
};
