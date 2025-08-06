'use client'; // This page component needs to be a client component to render ClientPanel

import ClientPanel from '../../../components/client/ClientPanel'; // Adjust path as needed

// This is the main Page component for your dynamic client dashboard route.
// It's responsible for rendering the ClientPanel component and passing the dynamic params.
export default function ClientDynamicPage({ params }: { params: { id: string } }) {
  // The 'params' prop (containing the client ID) is passed directly to the ClientPanel.
  return <ClientPanel params={params} />;
}

// If you are using Static Site Generation (SSG) with `generateStaticParams`,
// you would keep that function here. For a dynamic route that fetches data
// on the client side, it's often not strictly necessary unless you want
// to pre-render specific paths at build time.
//
// export async function generateStaticParams() {
//   // In a real application, you would fetch data from a database or API
//   // to get all possible client IDs.
//   // Example: const clients = await getClientIdsFromDatabase();
//   // return clients.map((client) => ({
//   //   id: client.id,
//   // }));
  
//   // For this example, we will generate a few mock IDs for SSG.
//   return [{ id: '1' }, { id: '2' }, { id: '3' }];
// }
