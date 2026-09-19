import type {
  ConversationListItem,
  Message,
  MessageWithSender,
} from '@runner/shared';
import { supabase } from '@/lib/supabase';

export async function getOrCreateTaskConversation(taskId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_task_conversation', {
    p_micro_task_id: taskId,
  });
  if (error) throw error;
  return data as string;
}

export async function getOrCreateApplicationConversation(applicationId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_application_conversation', {
    p_application_id: applicationId,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchMyConversations(userId: string): Promise<ConversationListItem[]> {
  const { data: memberships, error: mErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  if (mErr) throw mErr;
  if (!memberships?.length) return [];

  const ids = memberships.map((m) => m.conversation_id);
  const readMap = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

  const { data: conversations, error: cErr } = await supabase
    .from('conversations')
    .select('id, vacancy_application_id, micro_task_id, created_at')
    .in('id', ids)
    .order('created_at', { ascending: false });

  if (cErr) throw cErr;

  const result: ConversationListItem[] = [];

  for (const conv of conversations ?? []) {
    const { data: peers } = await supabase
      .from('conversation_participants')
      .select('user_id, profiles:user_id(id, full_name, avatar_url)')
      .eq('conversation_id', conv.id)
      .neq('user_id', userId);

    const peer = peers?.[0] as
      | { user_id: string; profiles: { id: string; full_name: string; avatar_url: string | null } }
      | undefined;

    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('body, created_at, sender_id')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const last = lastMsgs?.[0] ?? null;
    let taskTitle: string | null = null;

    if (conv.micro_task_id) {
      const { data: task } = await supabase
        .from('micro_tasks')
        .select('title')
        .eq('id', conv.micro_task_id)
        .maybeSingle();
      taskTitle = task?.title ?? null;
    }

    const lastRead = readMap.get(conv.id);
    const unread = Boolean(
      last &&
        last.sender_id !== userId &&
        (!lastRead || new Date(last.created_at) > new Date(lastRead)),
    );

    result.push({
      ...conv,
      other_user: peer?.profiles
        ? {
            id: peer.profiles.id,
            full_name: peer.profiles.full_name,
            avatar_url: peer.profiles.avatar_url,
          }
        : null,
      last_message: last,
      task_title: taskTitle,
      unread,
    });
  }

  return result.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? a.created_at;
    const bTime = b.last_message?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export async function fetchMessages(conversationId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MessageWithSender[];
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: 'text',
      body: body.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export function subscribeToMessages(conversationId: string, onChange: () => void) {
  return supabase
    .channel(`messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onChange(),
    )
    .subscribe();
}

export function subscribeToConversationList(userId: string, onChange: () => void) {
  return supabase
    .channel(`conv-list-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => onChange(),
    )
    .subscribe();
}
