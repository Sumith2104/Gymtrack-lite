
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Send, AlertCircle, Search, Loader2, X } from 'lucide-react';
import type { Member } from '@/lib/types';
import { fetchMembers as fetchMembersAction } from '@/app/actions/member-actions';
import { sendMessageAction } from '@/app/actions/message-actions';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function MessagesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageInput, setNewMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const id = localStorage.getItem('gymDatabaseId');
    if (id) {
      setGymDatabaseId(id);
    } else {
      setFetchError("Gym ID not found. Please log in again.");
      setIsLoadingMembers(false);
    }
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
            const sortedMembers = response.data.sort((a, b) => a.name.localeCompare(b.name));
            setMembers(sortedMembers);
          }
        })
        .catch(() => {
          setFetchError("An unexpected error occurred while fetching members.");
          setMembers([]);
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    }
  }, [gymDatabaseId]);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.memberId && member.memberId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSendMessage = async () => {
    if (!selectedMember || !newMessageInput.trim() || !gymDatabaseId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send message. Ensure a member is selected, message is not empty, and gym ID is available." });
      return;
    }
    setIsSending(true);

    const response = await sendMessageAction(
      gymDatabaseId, // Admin's gym context
      selectedMember.id, // Receiver is the member's table UUID
      newMessageInput.trim() // Content
    );

    if (response.error || !response.newMessage) {
      toast({ variant: "destructive", title: "Message Failed", description: response.error || "Could not send message." });
    } else {
      toast({ title: "Message Sent!", description: `Your message to ${selectedMember.name} has been sent.` });
      setNewMessageInput('');
      // Note: This does not yet update the displayed conversation.
    }
    setIsSending(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-var(--header-height,10rem))]">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
          <MessageSquare className="mr-3 h-8 w-8" /> Messages
        </h1>
        <p className="text-muted-foreground mt-1">
          Select a member to view or start a conversation.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="md:col-span-1 shadow-lg flex flex-col max-h-full">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Members
            </CardTitle>
            <CardDescription>
              Click on a member to chat.
            </CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ paddingTop: '0.5rem' }}/>
              <Input
                type="search"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <Separator className="shrink-0"/>
          <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-1">
                {isLoadingMembers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 rounded-md">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : fetchError ? (
                  <div className="p-4 text-center text-destructive">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">{fetchError}</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    {searchTerm ? "No members match your search." : "No members found."}
                  </p>
                ) : (
                  filteredMembers.map(member => (
                    <Button
                      key={member.id}
                      variant="ghost"
                      className={cn(
                        'group w-full justify-start h-auto p-3 text-left rounded-md',
                        selectedMember?.id === member.id
                          ? 'bg-muted text-foreground'
                          : 'hover:bg-muted/60 focus:bg-muted/70'
                      )}
                      onClick={() => setSelectedMember(member)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium truncate",
                           selectedMember?.id === member.id ? "text-foreground" : "text-foreground"
                        )}>{member.name}</div>
                        <div className={cn(
                          "text-xs truncate",
                          selectedMember?.id === member.id ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground/80"
                        )}>{member.memberId || 'N/A'}</div>
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
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                {getInitials(selectedMember.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-xl">{selectedMember.name}</CardTitle>
                            <CardDescription>{selectedMember.memberId || 'N/A'}</CardDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedMember(null)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close chat</span>
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mb-4 text-primary/30" />
                  <p className="text-lg">Conversation with {selectedMember.name}</p>
                  <p className="text-sm">Messaging UI is under development.</p>
                  <p className="text-xs mt-2">(Actual message display will be implemented next.)</p>
                </div>
              </CardContent>
              <CardFooter className="p-4 border-t shrink-0">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    value={newMessageInput}
                    onChange={(e) => setNewMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isSending}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isSending) { e.preventDefault(); handleSendMessage();}}}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessageInput.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardFooter>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full">
              {isLoadingMembers ? (
                 <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading members...</p>
                 </div>
              ) : (
                <>
                  <MessageSquare className="h-20 w-20 text-muted-foreground/30 mb-4" />
                  <p className="text-lg text-muted-foreground">Select a member to start chatting.</p>
                  <p className="text-sm text-muted-foreground/70">Your conversation will appear here.</p>
                </>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
