'use client'; // This page component needs to be a client component to render ClientPanel

import { useEffect } from 'react';
import ClientPanel from '../../../components/client/ClientPanel'; // Adjust path as needed
import { useRouter } from 'next/navigation';

// This is the main Page component for your dynamic client dashboard route.
// It's responsible for rendering the ClientPanel component and passing the dynamic params.
export default function ClientDynamicPage({ params }: { params: { id: string } }) {
  // The 'params' prop (containing the client ID) is passed directly to the ClientPanel.
    
  return <ClientPanel params={params} />;
}
