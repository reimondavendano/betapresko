// app/signup/page.tsx

import type { Metadata } from 'next';
import SignUpPage from '../../components/client/steps/SignUpPage';
// Import the static image file. Next.js will automatically provide its metadata.
import ogImage from '../../public/assets/images/cover.png';

type Props = {
  searchParams: {
    ref?: string;
  };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const referralId = searchParams.ref;
  const pageTitle = referralId ? `You've been referred to Presko AC by a friend!` : 'Presko AC | Sign Up & Book a Service';
  const pageDescription = 'Book an AC cleaning service with Presko AC and get a special discount!';
  
  return {
    // The metadataBase property is not needed here as we are using a direct import
    metadataBase: new URL(`https://betapresko.vercel.app/`),
    title: pageTitle,
    description: pageDescription,
    // Add Open Graph tags for social media sharing
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `/signup${referralId ? `?ref=${referralId}` : ''}`,
      images: [
        {
          url: ogImage.src,
          width: ogImage.width,
          height: ogImage.height,
          alt: 'Presko AC Referral Link Cover',
        },
      ],
      type: 'website',
    }
  };
}

export default function SignUp({ searchParams }: Props) {
  return <SignUpPage />;
}
