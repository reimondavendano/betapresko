// app/signup/page.tsx

import type { Metadata } from 'next';
import SignUpPage from '../../components/client/steps/SignUpPage';

type Props = {
  searchParams: {
    ref?: string;
  };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const referralId = searchParams.ref;
  const pageTitle = referralId ? `You've been referred to Presko AC by a friend!` : 'Presko AC | Sign Up & Book a Service';
  const pageDescription = 'Book an AC cleaning service with Presko AC and get a special discount!';
  
  // The imageUrl now points to the static file path you provided
  const imageUrl = `/assets/images/cover.png`;

  return {
    metadataBase: new URL("https://betapresko.vercel.app/"),
    title: pageTitle,
    description: pageDescription,
    // Add Open Graph tags for social media sharing
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `/signup${referralId ? `?ref=${referralId}` : ''}`,
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

export default function SignUp({ searchParams }: Props) {
  return <SignUpPage />;
}
