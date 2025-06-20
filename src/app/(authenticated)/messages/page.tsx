
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Construction } from 'lucide-react';

export default function MessagesPage() {
  // Placeholder state and functions - will be expanded later
  // const [conversations, setConversations] = useState([]);
  // const [selectedConversation, setSelectedConversation] = useState(null);
  // const [newMessage, setNewMessage] = useState('');

  // const handleSendMessage = () => {
  //   console.log('Sending message:', newMessage);
  //   setNewMessage('');
  // };

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
          <MessageSquare className="mr-3 h-8 w-8" /> Messages
        </h1>
        <p className="text-muted-foreground mt-1">
          View and reply to messages from your gym members.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Construction className="mr-2 h-5 w-5 text-primary" />
            Feature Under Construction
          </CardTitle>
          <CardDescription>
            The messaging interface is currently being developed. Check back soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            <p>This section will allow you to:</p>
            <ul className="list-disc list-inside inline-block text-left mt-2">
              <li>View conversations with members.</li>
              <li>Reply to member inquiries.</li>
              <li>Receive notifications for new messages.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
