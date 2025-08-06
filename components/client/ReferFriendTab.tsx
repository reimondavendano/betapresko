'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReferFriendTabProps {
  clientId: string; // Passed from ClientPanel
}

export function ReferFriendTab({ clientId }: ReferFriendTabProps) {
  // Mock referral code or link
  const referralLink = `https://your-app.com/signup?ref=${clientId}`; 

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        alert('Referral link copied to clipboard!'); // Replace with a more elegant toast/notification
      })
      .catch((err) => {
        console.error('Failed to copy link: ', err);
        alert('Failed to copy link. Please try again.');
      });
  };

  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white flex flex-col items-center justify-center text-center min-h-[400px]">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-green-600 flex items-center justify-center">
          <Gift className="w-8 h-8 mr-3" />
          Refer a Friend & Earn!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700 text-lg">
          Share the love for clean air! Refer your friends and earn points for every successful booking they make.
        </p>
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-2">
          <p className="font-mono text-gray-800 text-sm break-all">{referralLink}</p>
          <Button 
            onClick={handleCopyLink} 
            variant="outline" 
            size="sm"
            className="flex-shrink-0"
          >
            <Share2 className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Your friends will get a special discount on their first service!
        </p>
      </CardContent>
    </Card>
  );
}
