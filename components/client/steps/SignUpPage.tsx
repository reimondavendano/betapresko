"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const SignUpPage = () => {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referralId = params.get('ref');

    if (referralId) {
      sessionStorage.setItem('referralId', referralId);
      
    }

    setRedirecting(true);
    setTimeout(() => {
      window.location.href = typeof window !== 'undefined'
        ? `${window.location.origin}/booking`
        : `https://betapresko.vercel.app/booking`;
    }, 1000);

  }, []); // The dependency array is now empty since we don't need 'onRedirect'

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-gray-50 rounded-xl shadow-lg">
      <Loader2 className="w-16 h-16 text-blue-600 mb-4" />
      <h3 className="text-2xl font-bold text-gray-800">
        {redirecting ? 'Redirecting to booking...' : 'Loading...'}
      </h3>
      <p className="mt-2 text-gray-600">Please wait while we prepare your booking experience.</p>
    </div>
  );
};

export default SignUpPage;
