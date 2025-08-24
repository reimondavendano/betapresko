'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Link, Check, X, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image'; // Import the Next.js Image component

interface ReferFriendTabProps {
  clientId: string; // Passed from ClientPanel
}

export function ReferFriendTab({ clientId }: ReferFriendTabProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Mock referral link
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${clientId}`
    : `https://betapresko.vercel.app/signup?ref=${clientId}`;
  
  // The message to share, with the referral link embedded
  const shareMessage = `Thank you for supporting Presko AC! For our services, you may click the link to register.`;


  // For Facebook, we use the sharer.php endpoint.
  // The 'u' parameter is for the URL to share, and 'quote' is for the pre-filled message.
  const facebookShareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareMessage)}`;

  // Function to display a temporary notification
  const showTempNotification = (message: string, error = false) => {
    setNotificationMessage(message);
    setIsError(error);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage('');
    }, 3000); // Hide after 3 seconds
  };

  const handleCopyLink = () => {
    try {
      // Create a temporary textarea element to hold the text
      const tempInput = document.createElement('textarea');
      tempInput.value = referralLink;
      document.body.appendChild(tempInput);
      
      // Select the text and execute the copy command
      tempInput.select();
      document.execCommand('copy');
      
      // Clean up the temporary element
      document.body.removeChild(tempInput);

      showTempNotification('Referral link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link: ', err);
      showTempNotification('Failed to copy link. Please try again.', true);
    }
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
        {/* The image is added here */}
        {/* <div className="w-full flex justify-center py-4">
          <Image
            src="/assets/images/cover.png"
            alt="Presko AC Referral Cover"
            width={600}
            height={300}
            className="rounded-lg shadow-md"
          />
        </div> */}
        <p className="text-gray-700 text-lg">
          Share the love for clean air! Refer your friends and earn points for every successful booking they make.
        </p>
        
        {/* Referral Link and Copy Button */}
        {/* The layout for this div is updated to be responsive */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-gray-800 text-sm break-all w-full sm:w-auto text-left">
            {referralLink}
          </p>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="flex-shrink-0 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md shadow-md"
          >
            <Link className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>

        {/* Share Buttons */}
        <p className="text-gray-600 text-base">Or, share directly:</p>
        {/* The share buttons are already in a responsive column/row layout */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <a href={facebookShareLink} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button
                variant="outline"
                    className="rounded-lg w-full border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md shadow-md flex items-center justify-center"
                >
                    <Facebook className="w-5 h-5 mr-3" />
                    Share on Facebook
                </Button>
            </a>
        </div>
      </CardContent>

      {/* Custom Notification Modal */}
      {showNotification && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-xl flex items-center ${isError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {isError ? (
            <X className="w-5 h-5 mr-2" />
          ) : (
            <Check className="w-5 h-5 mr-2" />
          )}
          <span>{notificationMessage}</span>
        </div>
      )}
    </Card>
  );
}
