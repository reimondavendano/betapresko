// app/signup/page.tsx

// Import the Metadata type from Next.js
import type { Metadata } from 'next';
import SignUpPage from '../../components/client/steps/SignUpPage';

// Define a type for the page props to access search parameters
type Props = {
  searchParams: {
    ref?: string; // The referral ID from the URL
  };
};

/**
 * The generateMetadata function runs on the server and is used to create dynamic metadata for the page.
 * This is crucial for social media sharing previews (Open Graph tags).
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const referralId = searchParams.ref;
  const pageTitle = referralId ? `You've been referred to Presko AC by a friend!` : 'Presko AC | Sign Up & Book a Service';
  const pageDescription = 'Book an AC cleaning service with Presko AC and get a special discount!';
  const imageUrl = `/assets/images/cover.png`; 

  return {
    title: pageTitle,
    description: pageDescription,
    // Add Open Graph tags for social media sharing
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `https://betapresko.vercel.app/signup${referralId ? `?ref=${referralId}` : ''}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Presko AC Referral Link Cover',
        },
      ],
      type: 'website',
    },
  };
}

// The default export of the page remains the same.
// It will render your client-side SignUpPage component.
export default function SignUp({ searchParams }: Props) {
  return <SignUpPage />;
}
