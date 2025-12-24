import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('API /send-email called, method:', req.method);
  
  // Handle preflight request first
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log('Processing email request, body:', JSON.stringify(req.body).substring(0, 200));
    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, and either html or text' 
      });
    }

    // Get API key from environment variable (set in Vercel dashboard)
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@zieglercabin.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'Ziegler Family Cabin';

    console.log('RESEND_API_KEY present:', !!apiKey, apiKey ? `(starts with ${apiKey.substring(0, 5)}...)` : '');

    if (!apiKey) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.' 
      });
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || 'Failed to send email' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      messageId: data.id 
    });

  } catch (error: any) {
    console.error('Email sending error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}
