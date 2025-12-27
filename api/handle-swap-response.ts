import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token, action } = req.query;

  if (!token || !action) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing token or action parameter' 
    });
  }

  if (action !== 'accept' && action !== 'decline') {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid action. Must be "accept" or "decline"' 
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return res.status(500).json({ 
      success: false, 
      error: 'Server configuration error' 
    });
  }

  // Use service role key to bypass RLS for this operation
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find the swap request by token
    const { data: swapRequest, error: fetchError } = await supabase
      .from('reservation_swap_requests')
      .select(`
        *,
        requester_reservation:reservations!requester_reservation_id(id, start_date, end_date, user_id),
        target_reservation:reservations!target_reservation_id(id, start_date, end_date, user_id)
      `)
      .eq('token', token)
      .single();

    if (fetchError || !swapRequest) {
      return res.status(404).json({ 
        success: false, 
        error: 'Swap request not found or invalid token' 
      });
    }

    // Check if already processed
    if (swapRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `This swap request has already been ${swapRequest.status}`,
        status: swapRequest.status
      });
    }

    // Check if expired
    if (new Date(swapRequest.expires_at) < new Date()) {
      await supabase
        .from('reservation_swap_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', swapRequest.id);

      return res.status(400).json({ 
        success: false, 
        error: 'This swap request has expired' 
      });
    }

    if (action === 'accept') {
      // Swap the reservations
      const { error: swap1Error } = await supabase
        .from('reservations')
        .update({ 
          user_id: swapRequest.target_user_id, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', swapRequest.requester_reservation_id);

      if (swap1Error) {
        console.error('Error swapping reservation 1:', swap1Error);
        throw new Error('Failed to swap reservations');
      }

      const { error: swap2Error } = await supabase
        .from('reservations')
        .update({ 
          user_id: swapRequest.requester_id, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', swapRequest.target_reservation_id);

      if (swap2Error) {
        console.error('Error swapping reservation 2:', swap2Error);
        throw new Error('Failed to swap reservations');
      }

      // Update swap request status
      await supabase
        .from('reservation_swap_requests')
        .update({ 
          status: 'accepted', 
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', swapRequest.id);

      // Cancel other pending requests for these reservations
      await supabase
        .from('reservation_swap_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .neq('id', swapRequest.id)
        .eq('status', 'pending')
        .or(`requester_reservation_id.eq.${swapRequest.requester_reservation_id},requester_reservation_id.eq.${swapRequest.target_reservation_id},target_reservation_id.eq.${swapRequest.requester_reservation_id},target_reservation_id.eq.${swapRequest.target_reservation_id}`);

      // Create notification for requester
      await supabase.from('notifications').insert({
        user_id: swapRequest.requester_id,
        title: 'Swap Request Accepted!',
        message: 'Your reservation swap request was accepted. The reservations have been swapped.',
        type: 'reservation',
      });

      return res.status(200).json({ 
        success: true, 
        action: 'accepted',
        message: 'Swap request accepted! The reservations have been swapped.'
      });

    } else {
      // Decline the request
      await supabase
        .from('reservation_swap_requests')
        .update({ 
          status: 'declined', 
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', swapRequest.id);

      // Create notification for requester
      await supabase.from('notifications').insert({
        user_id: swapRequest.requester_id,
        title: 'Swap Request Declined',
        message: 'Your reservation swap request was declined.',
        type: 'reservation',
      });

      return res.status(200).json({ 
        success: true, 
        action: 'declined',
        message: 'Swap request declined.'
      });
    }

  } catch (error: any) {
    console.error('Error handling swap response:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}
