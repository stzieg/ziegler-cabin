/**
 * Email templates for invitation system
 * Requirements: 8.2, 8.3
 */

export interface EmailTemplateData {
  recipientEmail: string;
  invitationUrl: string;
  expiresAt: string;
  senderName?: string;
}

/**
 * Generate HTML email template for invitation
 */
export const generateInvitationEmailHTML = (data: EmailTemplateData): string => {
  const { recipientEmail, invitationUrl, expiresAt } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join Our Cabin Management System</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f0;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            margin-bottom: 10px;
        }
        .logo img {
            width: 80px;
            height: auto;
        }
        .title {
            color: #2D5016;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .invitation-button {
            display: inline-block;
            background-color: #2D5016;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .invitation-button:hover {
            background-color: #1a2f0a;
        }
        .expiration-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0d8;
            font-size: 14px;
            color: #666;
        }
        .link-fallback {
            word-break: break-all;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://zieglercabin.com/images/cursive-z-logo.jpg" alt="Ziegler Cabin" width="80" />
            </div>
            <h1 class="title">You're Invited!</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>You've been invited to join the Ziegler family cabin management system. This platform helps us coordinate visits, keep track of things that need to be done, and stay connected as a family.</p>
            
            <p>To get started, click the button below to create your account:</p>
            
            <div style="text-align: center;">
                <a href="${invitationUrl}" class="invitation-button">Accept Invitation</a>
            </div>
            
            <div class="expiration-notice">
                <strong>⏰ Important:</strong> This invitation expires on ${expiresAt}. Please register before this date to ensure access.
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-fallback">${invitationUrl}</div>
            
            <p>We're excited to have you join our cabin community!</p>
            
            <p>Best regards,<br>
            The Cabin Management Team</p>
        </div>
        
        <div class="footer">
            <p><small>This invitation was sent to ${recipientEmail}. If you didn't expect this invitation, you can safely ignore this email.</small></p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text email template for invitation
 */
export const generateInvitationEmailText = (data: EmailTemplateData): string => {
  const { recipientEmail, invitationUrl, expiresAt, senderName = 'Cabin Management Team' } = data;
  
  return `
You're Invited to Join Our Cabin Management System!

Hello,

You've been invited by ${senderName} to join our family cabin management system. This platform helps us coordinate cabin visits, manage bookings, and stay connected as a family.

To get started, visit this link to create your account:
${invitationUrl}

IMPORTANT: This invitation expires on ${expiresAt}. Please register before this date to ensure access.

We're excited to have you join our cabin community!

Best regards,
The Cabin Management Team

---
This invitation was sent to ${recipientEmail}. If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
};

/**
 * Generate email subject line
 */
export const generateInvitationEmailSubject = (): string => {
  return "Cabin Management System - Registration Invitation";
};

/**
 * Validate email template data
 */
export const validateEmailTemplateData = (data: EmailTemplateData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.recipientEmail || !data.recipientEmail.includes('@')) {
    errors.push('Valid recipient email is required');
  }
  
  if (!data.invitationUrl || !data.invitationUrl.startsWith('http')) {
    errors.push('Valid invitation URL is required');
  }
  
  if (!data.expiresAt) {
    errors.push('Expiration date is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format expiration date for email display
 */
export const formatExpirationDate = (expiresAt: string): string => {
  try {
    if (!expiresAt || expiresAt.trim() === '') {
      return expiresAt;
    }
    
    const date = new Date(expiresAt);
    
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return expiresAt;
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    console.error('Error formatting expiration date:', error);
    return expiresAt;
  }
};