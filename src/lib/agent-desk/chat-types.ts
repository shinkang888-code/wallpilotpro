export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  summary?: string;
  links?: Array<{ label: string; url: string }>;
  createdAt: number;
};
