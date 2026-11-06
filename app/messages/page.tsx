'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, MessageSquare, ArrowLeft, Flag, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Profile, Message } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConversationItem {
  id: string;
  otherUser: Profile | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!members || members.length === 0) { setLoading(false); return; }

      const convIds = members.map(m => m.conversation_id);
      const convs: ConversationItem[] = [];

      for (const convId of convIds) {
        const { data: otherMembers } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', convId)
          .neq('user_id', user.id);

        if (!otherMembers || otherMembers.length === 0) continue;
        const otherUserId = otherMembers[0].user_id;

        const { data: otherProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', otherUserId)
          .maybeSingle();

        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .is('read_at', null)
          .neq('sender_id', user.id);

        convs.push({
          id: convId,
          otherUser: otherProf as Profile,
          lastMessage: (msgs as Message[])[0] || null,
          unreadCount: count || 0,
        });
      }

      convs.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || '';
        const bTime = b.lastMessage?.created_at || '';
        return bTime.localeCompare(aTime);
      });

      setConversations(convs);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedConv || !user) return;
    (async () => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConv)
        .order('created_at', { ascending: true });
      setMessages((msgs as Message[]) || []);

      const { data: otherMembers } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', selectedConv)
        .neq('user_id', user.id);
      
      if (otherMembers && otherMembers.length > 0) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', otherMembers[0].user_id)
          .maybeSingle();
        setOtherUser(prof as Profile);
      }

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', selectedConv)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setConversations(prev => prev.map(c => c.id === selectedConv ? { ...c, unreadCount: 0 } : c));
    })();
  }, [selectedConv, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !selectedConv || !newMessage.trim()) return;
    setSending(true);
    const { data: msg } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        content: newMessage.trim(),
      })
      .select('*')
      .single();

    if (msg) {
      setMessages(prev => [...prev, msg as Message]);
      setNewMessage('');
      setConversations(prev => prev.map(c => c.id === selectedConv ? { ...c, lastMessage: msg as Message } : c));
    }
    setSending(false);
  };

  const handleBlock = async () => {
    if (!user || !otherUser) return;
    const { error } = await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: otherUser.user_id });
    if (error && !error.message.includes('duplicate')) { toast.error(error.message); return; }
    toast.success('User blocked');
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex">
        {/* Conversation List */}
        <div className={cn('w-full border-r flex flex-col', selectedConv && 'hidden lg:flex')}>
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Start a conversation from a post or profile.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={cn('flex items-center gap-3 w-full p-3 border-b hover:bg-secondary transition-colors text-left', selectedConv === conv.id && 'bg-secondary')}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={conv.otherUser?.avatar_url || undefined} />
                    <AvatarFallback>{conv.otherUser?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.otherUser?.display_name || 'Unknown'}</span>
                      {conv.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.content || 'No messages yet'}</p>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat View */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConv(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback>{otherUser?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{otherUser?.display_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground truncate">{otherUser?.headline || ''}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleBlock} title="Block user"><Ban className="h-4 w-4" /></Button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={cn('flex', msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[70%] rounded-2xl px-4 py-2 text-sm', msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                    <p>{msg.content}</p>
                    <p className={cn('text-[10px] mt-1', msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
              <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
