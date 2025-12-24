/**
 * Email templates for reservation swap requests
 */

export interface SwapRequestEmailData {
  recipientEmail: string;
  recipientName: string;
  requesterName: string;
  offeredDates: string;
  requestedDates: string;
  message?: string;
  acceptUrl: string;
  declineUrl: string;
  expiresAt: string;
}

export interface SwapResponseEmailData {
  recipientEmail: string;
  recipientName: string;
  responderName: string;
  offeredDates: string;
  requestedDates: string;
  accepted: boolean;
}

/**
 * Generate HTML email for swap request
 */
export const generateSwapRequestEmailHTML = (data: SwapRequestEmailData): string => {
  const { 
    recipientName, 
    requesterName, 
    offeredDates, 
    requestedDates, 
    message,
    acceptUrl, 
    declineUrl,
    expiresAt 
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservation Swap Request</title>
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
        .swap-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .swap-arrow {
            text-align: center;
            font-size: 24px;
            color: #2D5016;
            margin: 10px 0;
        }
        .date-box {
            background-color: white;
            border: 1px solid #e0e0d8;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        .date-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .date-value {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        .message-box {
            background-color: #e8f5e9;
            border-left: 4px solid #2D5016;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .accept-button {
            display: inline-block;
            background-color: #2D5016;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 10px;
        }
        .decline-button {
            display: inline-block;
            background-color: #dc3545;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 10px;
        }
        .expiration-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
            text-align: center;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0d8;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://zieglercabin.com/images/cursive-z-logo.png" alt="Ziegler Cabin" width="80" />
            </div>
            <h1 class="title">Reservation Swap Request</h1>
        </div>
        
        <div class="content">
            <p>Hi ${recipientName},</p>
            
            <p><strong>${requesterName}</strong> would like to swap reservations with you!</p>
            
            <div class="swap-details">
                <div class="date-box">
                    <div class="date-label">They're offering you</div>
                    <div class="date-value">${offeredDates}</div>
                </div>
                
                <div class="swap-arrow">⇅</div>
                
                <div class="date-box">
                    <div class="date-label">In exchange for your reservation</div>
                    <div class="date-value">${requestedDates}</div>
                </div>
            </div>
            
            ${message ? `
            <div class="message-box">
                <strong>Message from ${requesterName}:</strong><br>
                "${message}"
            </div>
            ` : ''}
            
            <div class="button-container">
                <a href="${acceptUrl}" class="accept-button">Accept Swap</a>
                <a href="${declineUrl}" class="decline-button">Decline</a>
            </div>
            
            <div class="expiration-notice">
                <strong>⏰ This request expires on ${expiresAt}</strong>
            </div>
            
            <p>You can also respond by logging into the cabin website and viewing your pending swap requests.</p>
        </div>
        
        <div class="footer">
            <p><small>If you didn't expect this request, you can safely ignore it or decline.</small></p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text email for swap request
 */
export const generateSwapRequestEmailText = (data: SwapRequestEmailData): string => {
  const { 
    recipientName, 
    requesterName, 
    offeredDates, 
    requestedDates, 
    message,
    acceptUrl, 
    declineUrl,
    expiresAt 
  } = data;

  return `
Reservation Swap Request

Hi ${recipientName},

${requesterName} would like to swap reservations with you!

SWAP DETAILS:
- They're offering: ${offeredDates}
- In exchange for: ${requestedDates}

${message ? `Message from ${requesterName}: "${message}"` : ''}

To accept this swap, visit:
${acceptUrl}

To decline, visit:
${declineUrl}

This request expires on ${expiresAt}.

You can also respond by logging into the cabin website.

---
If you didn't expect this request, you can safely ignore it or decline.
  `.trim();
};

/**
 * Generate HTML email for swap response notification
 */
export const generateSwapResponseEmailHTML = (data: SwapResponseEmailData): string => {
  const { recipientName, responderName, offeredDates, requestedDates, accepted } = data;

  const statusColor = accepted ? '#2D5016' : '#dc3545';
  const statusText = accepted ? 'Accepted' : 'Declined';
  const statusEmoji = accepted ? '✅' : '❌';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Swap Request ${statusText}</title>
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
            color: ${statusColor};
            font-size: 24px;
            margin-bottom: 20px;
        }
        .status-badge {
            display: inline-block;
            background-color: ${statusColor};
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: 600;
            margin: 20px 0;
        }
        .swap-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0d8;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://zieglercabin.com/images/cursive-z-logo.png" alt="Ziegler Cabin" width="80" />
            </div>
            <h1 class="title">${statusEmoji} Swap Request ${statusText}</h1>
        </div>
        
        <div class="content">
            <p>Hi ${recipientName},</p>
            
            <p><strong>${responderName}</strong> has <strong>${statusText.toLowerCase()}</strong> your reservation swap request.</p>
            
            <div class="swap-details">
                <p><strong>Your offer:</strong> ${offeredDates}</p>
                <p><strong>Requested:</strong> ${requestedDates}</p>
            </div>
            
            ${accepted ? `
            <p>🎉 Great news! The reservations have been swapped. You now have the reservation for <strong>${requestedDates}</strong>.</p>
            <p>Log in to the cabin website to see your updated calendar.</p>
            ` : `
            <p>Unfortunately, ${responderName} was unable to swap at this time. You can try requesting a swap with someone else or keep your current reservation.</p>
            `}
        </div>
        
        <div class="footer">
            <p><small>This is an automated notification from the Ziegler Family Cabin system.</small></p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text email for swap response
 */
export const generateSwapResponseEmailText = (data: SwapResponseEmailData): string => {
  const { recipientName, responderName, offeredDates, requestedDates, accepted } = data;

  const statusText = accepted ? 'ACCEPTED' : 'DECLINED';

  return `
Swap Request ${statusText}

Hi ${recipientName},

${responderName} has ${statusText.toLowerCase()} your reservation swap request.

Your offer: ${offeredDates}
Requested: ${requestedDates}

${accepted 
  ? `Great news! The reservations have been swapped. You now have the reservation for ${requestedDates}. Log in to the cabin website to see your updated calendar.`
  : `Unfortunately, ${responderName} was unable to swap at this time. You can try requesting a swap with someone else or keep your current reservation.`
}

---
This is an automated notification from the Ziegler Family Cabin system.
  `.trim();
};

/**
 * Format date range for display
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  };
  
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  }
  
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
};
