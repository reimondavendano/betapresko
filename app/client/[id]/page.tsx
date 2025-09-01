'use client';

import Notifications from '@/components/Notifications';
import ClientPanel from '../../../components/client/ClientPanel';
import { RealtimeProvider } from '@/app/RealtimeContext';

export default function ClientDynamicPage({ params }: { params: { id: string } }) {
  return (
    <RealtimeProvider>
      <Notifications client_id={params.id} />
      <ClientPanel params={params} />
    </RealtimeProvider>
  );
}
