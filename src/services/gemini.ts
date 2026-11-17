export interface ChatTurn {
  sender: 'USER' | 'ASSISTANT';
  content: string;
}

export async function sendAssistantMessage(params: {
  conversationId?: string;
  message: string;
  history: ChatTurn[];
}): Promise<{ conversationId: string; reply: string }> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'ZEXUNA AI Restaurant Assistant is temporarily unavailable.');
  }
  return data as { conversationId: string; reply: string };
}
