export interface GoogleChatSpace {
  name: string; // e.g., "spaces/AAAAAAAAAAA"
  displayName?: string;
  spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE' | string;
  type?: string;
  spaceThreadingState?: string;
}

export interface GoogleChatMessage {
  name: string;
  text?: string;
  createTime?: string;
  sender?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: string;
  };
}

export interface GoogleChatApiError {
  isChatAppNotConfigured?: boolean;
  status?: number;
  message: string;
  consoleUrl?: string;
}

const PROJECT_ID = 'gen-lang-client-0051306922';
export const GOOGLE_CHAT_CONSOLE_CONFIG_URL = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${PROJECT_ID}`;

// Parse response or throw user-friendly Chat API error
async function handleResponse(res: Response) {
  if (res.ok) {
    return res.json();
  }

  let errorData: any = null;
  try {
    errorData = await res.json();
  } catch {
    // ignore
  }

  const rawMessage = errorData?.error?.message || res.statusText || 'Google Chat API error';
  const isChatAppNotConfigured =
    res.status === 404 &&
    (rawMessage.includes('Google Chat app not found') ||
      rawMessage.includes('To create a Chat app') ||
      rawMessage.toLowerCase().includes('chat app'));

  const customError: GoogleChatApiError = {
    isChatAppNotConfigured,
    status: res.status,
    message: isChatAppNotConfigured
      ? 'Google Chat app not yet configured in Google Cloud Console. To use the Chat API with your Workspace account, configure the Chat app in your Cloud Project.'
      : rawMessage,
    consoleUrl: GOOGLE_CHAT_CONSOLE_CONFIG_URL,
  };

  throw customError;
}

// 1. List user spaces / rooms
export async function listSpaces(accessToken: string): Promise<GoogleChatSpace[]> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await handleResponse(res);
  return (data.spaces as GoogleChatSpace[]) || [];
}

// 2. List messages in a space
export async function listMessages(
  accessToken: string,
  spaceName: string,
  pageSize = 40
): Promise<GoogleChatMessage[]> {
  const url = `https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=${pageSize}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await handleResponse(res);
  const messages: GoogleChatMessage[] = data.messages || [];

  // Sort messages oldest to newest for standard bottom-flow chat view
  return messages.sort((a, b) => {
    const timeA = new Date(a.createTime || 0).getTime();
    const timeB = new Date(b.createTime || 0).getTime();
    return timeA - timeB;
  });
}

// 3. Post a message to a space
export async function sendMessage(
  accessToken: string,
  spaceName: string,
  text: string
): Promise<GoogleChatMessage> {
  const url = `https://chat.googleapis.com/v1/${spaceName}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  return handleResponse(res);
}

// 4. Create a new Google Chat space
export async function createSpace(
  accessToken: string,
  displayName: string
): Promise<GoogleChatSpace> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      spaceType: 'SPACE',
    }),
  });

  return handleResponse(res);
}
