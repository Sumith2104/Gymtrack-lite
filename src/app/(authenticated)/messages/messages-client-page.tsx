
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Send, AlertCircle, Search, Loader2, X, Smile, RefreshCw } from 'lucide-react';
import type { Member, Message } from '@/lib/types';
import { fetchMembers as fetchMembersAction } from '@/app/actions/member-actions';
import { fetchMessagesAction, sendMessageAction } from '@/app/actions/message-actions';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

const formatDateGroupHeader = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

const getInitials = (name: string): string => {
  if (!name) return '??';
  const names = name.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return '??';

  if (names.length > 1) {
    const firstInitial = names[0][0];
    const lastInitial = names[names.length - 1][0];
    return (firstInitial + lastInitial).toUpperCase();
  }
  
  if (names[0].length > 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  
  return names[0][0].toUpperCase();
};

export function MessagesClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
  const [adminSenderFormattedGymId, setAdminSenderFormattedGymId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageInput, setNewMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);


  useEffect(() => {
    const gymDbId = localStorage.getItem('gymDatabaseId');
    const formattedGymId = localStorage.getItem('gymId');
    if (gymDbId) setGymDatabaseId(gymDbId);
    else {
      setFetchError("Gym Database ID not found. Please log in again.");
      setIsLoadingMembers(false);
    }
    if (formattedGymId) setAdminSenderFormattedGymId(formattedGymId);
    else console.warn("Admin sender ID (formatted_gym_id) not found in localStorage.");
    
  }, []);

  useEffect(() => {
    if (gymDatabaseId) {
      setIsLoadingMembers(true);
      setFetchError(null);
      fetchMembersAction(gymDatabaseId)
        .then(response => {
          if (response.error || !response.data) {
            setFetchError(response.error || "Failed to load members.");
            setMembers([]);
          } else {
            setMembers(response.data.sort((a, b) => a.name.localeCompare(b.name)));
          }
        })
        .catch(() => setFetchError("An unexpected error occurred while fetching members."))
        .finally(() => setIsLoadingMembers(false));
    }
  }, [gymDatabaseId]);

  useEffect(() => {
    const memberIdToSelect = searchParams.get('memberId');
    if (memberIdToSelect && members.length > 0) {
      const member = members.find(m => m.id === memberIdToSelect);
       if (member) {
        setSelectedMember(member);
      } else {
        // If member ID from URL is invalid, clear it.
        setSelectedMember(null);
        router.replace('/messages', { scroll: false });
      }
    } else {
        setSelectedMember(null);
    }
  }, [searchParams, members, router]);

  useEffect(() => {
    if (selectedMember && selectedMember.memberId && gymDatabaseId && adminSenderFormattedGymId) {
      const fetchAndSetMessages = async () => {
        const response = await fetchMessagesAction(gymDatabaseId, adminSenderFormattedGymId, selectedMember.memberId);
        if (response.error || !response.data) {
          // Don't show toast on poll error to avoid being intrusive.
          console.error("Error fetching messages:", response.error);
        } else {
          setConversationMessages(currentMessages => {
            if (JSON.stringify(currentMessages) !== JSON.stringify(response.data)) {
              return response.data;
            }
            return currentMessages;
          });
        }
      };

      setIsLoadingConversation(true);
      fetchAndSetMessages().finally(() => setIsLoadingConversation(false));
      
      const intervalId = setInterval(fetchAndSetMessages, 4000); // Poll every 4 seconds

      return () => clearInterval(intervalId);
    } else {
      setConversationMessages([]);
    }
  }, [selectedMember, gymDatabaseId, adminSenderFormattedGymId]);


  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.memberId && member.memberId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSendMessage = async () => {
    if (!selectedMember || !selectedMember.memberId || !newMessageInput.trim() || !gymDatabaseId || !adminSenderFormattedGymId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send message. Ensure member selected (with Member ID), message not empty, and IDs available." });
      return;
    }
    setIsSending(true);

    const response = await sendMessageAction(gymDatabaseId, adminSenderFormattedGymId, selectedMember.memberId, newMessageInput.trim());

    if (response.error || !response.newMessage) {
      toast({ variant: "destructive", title: "Message Failed", description: response.error || "Could not send message." });
    } else {
      setNewMessageInput('');
      // Optimistically add the new message. The next poll will sync the state.
      setConversationMessages(prevMessages => [...prevMessages, response.newMessage!]);
    }
    setIsSending(false);
  };

  let lastProcessedDateString: string | null = null;
  
  const handleCloseChat = () => {
    setSelectedMember(null);
    router.push('/messages', { scroll: false }); // Clear URL params and state
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
      <Card className="md:col-span-1 shadow-lg flex flex-col max-h-full">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-xl flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Members</CardTitle>
          <CardDescription>Click on a member to chat.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ paddingTop: '0.5rem' }}/>
            <Input type="search" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9"/>
          </div>
        </CardHeader>
        <Separator className="shrink-0"/>
        <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {isLoadingMembers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-2 rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1.5 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))
              ) : fetchError ? (
                <div className="p-4 text-center text-destructive"><AlertCircle className="mx-auto h-8 w-8 mb-2" /><p className="text-sm">{fetchError}</p></div>
              ) : filteredMembers.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground">{searchTerm ? "No members match." : "No members found."}</p>
              ) : (
                filteredMembers.map(member => (
                  <Button key={member.id} variant="ghost"
                    className={cn('group w-full justify-start h-auto p-3 text-left rounded-md', selectedMember?.id === member.id ? 'bg-muted text-foreground' : 'hover:bg-muted/60 focus:bg-muted/70')}
                    onClick={() => setSelectedMember(member)}>
                    <Avatar className="h-10 w-10 mr-3"><AvatarFallback className="bg-primary/20 text-primary font-semibold">{getInitials(member.name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium truncate", selectedMember?.id === member.id ? "text-foreground" : "text-foreground")}>{member.name}</div>
                      <div className={cn("text-xs truncate", selectedMember?.id === member.id ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground/80")}>{member.memberId || 'N/A'}</div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 shadow-lg flex flex-col max-h-full">
        {selectedMember ? (
          <>
            <CardHeader className="border-b shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/20 text-primary font-semibold">{getInitials(selectedMember.name)}</AvatarFallback></Avatar>
                  <div>
                      <CardTitle className="text-xl">{selectedMember.name}</CardTitle>
                      <CardDescription>{selectedMember.memberId || 'N/A'}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseChat} className="text-muted-foreground hover:text-destructive"><X className="h-5 w-5" /><span className="sr-only">Close chat</span></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0 bg-muted/20">
              {isLoadingConversation ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
              ) : conversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Smile className="h-16 w-16 mb-4 text-primary/30" />
                  <p className="text-lg">No messages yet.</p>
                  <p className="text-sm">Start the conversation with {selectedMember.name}!</p>
                </div>
              ) : (
                conversationMessages.map(msg => {
                  const messageDate = parseISO(msg.createdAt);
                  const messageDateString = format(messageDate, 'yyyy-MM-dd');
                  let dateHeaderElement: JSX.Element | null = null;

                  if (lastProcessedDateString !== messageDateString) {
                    dateHeaderElement = (
                      <div key={`date-header-${messageDateString}`} className="text-center text-xs text-muted-foreground my-3 py-1 px-3 bg-muted/80 rounded-full mx-auto w-fit shadow-sm">
                        {formatDateGroupHeader(messageDate)}
                      </div>
                    );
                    lastProcessedDateString = messageDateString;
                  }
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {dateHeaderElement}
                      <div className={cn("group flex w-full items-end gap-2", msg.senderId === adminSenderFormattedGymId ? "justify-end" : "justify-start")}>
                        {msg.senderId === adminSenderFormattedGymId && (
                          <p className="text-[10px] text-muted-foreground mb-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            {format(parseISO(msg.createdAt), 'p')}
                          </p>
                        )}
                        <div className={cn(
                          "max-w-[70%] p-3 rounded-2xl shadow", 
                          msg.senderId === adminSenderFormattedGymId ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.senderId !== adminSenderFormattedGymId && (
                          <p className="text-[10px] text-muted-foreground mb-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            {format(parseISO(msg.createdAt), 'p')}
                          </p>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <CardFooter className="p-4 border-t shrink-0">
              <div className="flex w-full items-center space-x-2">
                <Input value={newMessageInput} onChange={(e) => setNewMessageInput(e.target.value)} placeholder="Type your message..." className="flex-1"
                  disabled={isSending || !adminSenderFormattedGymId || isLoadingConversation || !selectedMember?.memberId}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isSending && adminSenderFormattedGymId && !isLoadingConversation && selectedMember?.memberId) { e.preventDefault(); handleSendMessage();}}}
                />
                <Button onClick={handleSendMessage} disabled={isSending || !newMessageInput.trim() || !adminSenderFormattedGymId || isLoadingConversation || !selectedMember?.memberId}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {!adminSenderFormattedGymId && <p className="text-xs text-destructive mt-1">Admin sender ID (Gym ID) missing. Cannot send.</p>}
              {!selectedMember?.memberId && selectedMember && <p className="text-xs text-destructive mt-1">Selected member is missing a Member ID. Cannot send.</p>}
            </CardFooter>
          </>
        ) : (
          <CardContent className="flex flex-col items-center justify-center h-full">
            {isLoadingMembers ? (
               <div className="flex flex-col items-center"><Loader2 className="h-12 w-12 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading members...</p></div>
            ) : (
              <><MessageSquare className="h-20 w-20 text-muted-foreground/30 mb-4" /><p className="text-lg text-muted-foreground">Select a member to start chatting.</p><p className="text-sm text-muted-foreground/70">Your conversation will appear here.</p></>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
