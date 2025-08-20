import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { number, message, type = 'normal' } = req.body as {
    number: string;
    message: string;
    type?: 'normal' | 'priority' | 'otp';
  };

  const apikey = process.env.SEMAPHORE_API_KEY!;
  const sendername = process.env.SEMAPHORE_SENDER_NAME || 'SEMAPHORE';

  let url: string;
  if (type === 'priority') {
    url = 'https://api.semaphore.co/api/v4/priority';
  } else if (type === 'otp') {
    url = 'https://api.semaphore.co/api/v4/otp';
  } else {
    url = 'https://api.semaphore.co/api/v4/messages';
  }

  const params = new URLSearchParams({
    apikey: String(apikey),
    number: String(number),
    message: String(message),
    sendername: String(sendername),
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    console.error('Semaphore API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
