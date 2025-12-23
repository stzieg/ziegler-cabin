/**
 * Test script to verify Resend email setup
 * Run with: node test-email-setup.js
 */

// Test email configuration
const RESEND_API_KEY = 're_GmnMzGUZ_2g1AnKKAmLzXk6dKDMLc3aHn';
const FROM_EMAIL = 'onboarding@resend.dev'; // Temporary: use Resend's verified domain for testing
const CUSTOM_FROM_EMAIL = 'noreply@zieglercabin.com'; // Your custom domain (for later)
const TEST_EMAIL = 'samuel.t.ziegler@outlook.com'; // Your email for testing

async function testResendSetup() {
  console.log('🧪 Testing Resend email setup...\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `Ziegler Cabin Management <${FROM_EMAIL}>`,
        to: [TEST_EMAIL],
        subject: '🏠 Ziegler Cabin - Email Setup Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d5016;">🎉 Email Setup Successful!</h2>
            <p>Congratulations! Your Ziegler Cabin email system is now working properly.</p>
            <div style="background: #f0f7e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5016; margin-top: 0;">✅ What's Working:</h3>
              <ul>
                <li>Resend API integration ✅</li>
                <li>Email delivery ✅</li>
                <li>Professional formatting ✅</li>
                <li>Custom domain: ${CUSTOM_FROM_EMAIL} (pending DNS setup)</li>
              </ul>
            </div>
            <p>You can now send invitations through your cabin management system!</p>
            <p style="color: #666; font-size: 14px;">
              This test was sent at ${new Date().toLocaleString()}
            </p>
          </div>
        `,
        text: `
🎉 Email Setup Successful!

Congratulations! Your Ziegler Cabin email system is now working properly.

✅ What's Working:
- Custom domain: zieglercabin.com  
- Professional email address: ${FROM_EMAIL}
- Resend integration
- Email delivery

You can now send invitations through your cabin management system!

This test was sent at ${new Date().toLocaleString()}
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Test failed:', response.status, errorData);
      
      if (response.status === 401) {
        console.log('\n💡 This usually means:');
        console.log('   - Invalid API key');
        console.log('   - Check your Resend dashboard for the correct key');
      } else if (response.status === 422) {
        console.log('\n💡 This usually means:');
        console.log('   - Domain not verified in Resend');
        console.log('   - Check DNS records are properly set');
        console.log('   - Wait for DNS propagation (up to 24 hours)');
      }
      return;
    }

    const result = await response.json();
    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', result.id);
    console.log('📬 Sent to:', TEST_EMAIL);
    console.log('📤 From:', FROM_EMAIL);
    console.log('\n🎯 Next steps:');
    console.log('   1. Check your inbox (and spam folder)');
    console.log('   2. If received, your setup is complete!');
    console.log('   3. Update VITE_EMAIL_PROVIDER=resend in Vercel');
    console.log('   4. Deploy your app');

  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('\n💡 This usually means:');
    console.log('   - No internet connection');
    console.log('   - Firewall blocking the request');
    console.log('   - DNS issues');
  }
}

// Run the test
testResendSetup();