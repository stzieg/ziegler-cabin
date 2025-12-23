// Simple email proxy server using only Node.js built-ins
// Run with: node simple-email-proxy.cjs

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Only handle POST to /send-email
  if (req.method !== 'POST' || req.url !== '/send-email') {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { to, subject, html, text } = JSON.parse(body);
      
      console.log(`📧 Sending email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);

      // Resend configuration
      const RESEND_API_KEY = 'your-resend-api-key-here'; // Replace with your Resend API key
      const FROM_EMAIL = 'onboarding@resend.dev'; // Resend's test domain - works immediately
      const FROM_NAME = 'Ziegler Cabin Management';

      // Prepare Resend payload
      const payload = JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        text
      });

      // Make request to Resend
      const options = {
        hostname: 'api.resend.com',
        port: 443,
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const resendReq = https.request(options, (resendRes) => {
        let responseData = '';
        
        resendRes.on('data', (chunk) => {
          responseData += chunk;
        });

        resendRes.on('end', () => {
          if (resendRes.statusCode >= 200 && resendRes.statusCode < 300) {
            let messageId = 'sent';
            try {
              const result = JSON.parse(responseData);
              messageId = result.id || 'sent';
            } catch (e) {
              // If parsing fails, use default
            }
            
            console.log('✅ Email sent successfully via Resend! Message ID:', messageId);
            console.log('📧 Email details:');
            console.log(`   From: ${FROM_EMAIL}`);
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${subject}`);
            console.log('');
            console.log('🔍 Next steps:');
            console.log('   1. Check your inbox (should arrive in 1-2 minutes)');
            console.log('   2. Check spam/junk folder if not in inbox');
            console.log('   3. Resend has excellent deliverability!');
            console.log('');
            
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              success: true,
              messageId
            }));
          } else {
            console.error('❌ Resend error:', resendRes.statusCode, responseData);
            
            let errorMessage = `Resend API error: ${resendRes.statusCode}`;
            try {
              const errorJson = JSON.parse(responseData);
              if (errorJson.message) {
                errorMessage += ` - ${errorJson.message}`;
              }
              
              // Add helpful tips for common Resend errors
              if (errorJson.message && errorJson.message.includes('not verified')) {
                errorMessage += '\n\n💡 Tip: Verify your sender email in Resend dashboard.';
              } else if (errorJson.message && errorJson.message.includes('API key')) {
                errorMessage += '\n\n💡 Tip: Check that your Resend API key is correct.';
              }
            } catch (e) {
              errorMessage += ` - ${responseData}`;
            }
            
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({
              success: false,
              error: errorMessage
            }));
          }
        });
      });

      resendReq.on('error', (error) => {
        console.error('❌ Request error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          success: false,
          error: `Network error: ${error.message}`
        }));
      });

      resendReq.write(payload);
      resendReq.end();

    } catch (error) {
      console.error('❌ Server error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`📧 Email proxy server running on http://localhost:${PORT}`);
  console.log('🚀 Ready to proxy Resend requests and avoid CORS issues!');
  console.log('');
  console.log('To test:');
  console.log('1. Keep this server running');
  console.log('2. Set VITE_EMAIL_PROVIDER=sendgrid in your .env (uses this proxy)');
  console.log('3. Add your Resend API key to the proxy server');
  console.log('4. Test email in your app');
  console.log('');
  console.log('Press Ctrl+C to stop');
});