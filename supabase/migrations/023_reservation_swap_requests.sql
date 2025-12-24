-- Migration: Add reservation swap requests table
-- This enables users to request swapping their reservation with another user's reservation

-- Create the swap requests table
CREATE TABLE IF NOT EXISTS reservation_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester ON reservation_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_target_user ON reservation_swap_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON reservation_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_swap_requests_token ON reservation_swap_requests(token);

-- Enable RLS
ALTER TABLE reservation_swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view swap requests they're involved in (as requester or target)
CREATE POLICY "Users can view their swap requests"
    ON reservation_swap_requests FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

-- Users can create swap requests for their own reservations
CREATE POLICY "Users can create swap requests"
    ON reservation_swap_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Users can update swap requests they're involved in
CREATE POLICY "Users can update their swap requests"
    ON reservation_swap_requests FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

-- Users can delete their own pending swap requests
CREATE POLICY "Users can cancel their swap requests"
    ON reservation_swap_requests FOR DELETE
    USING (auth.uid() = requester_id AND status = 'pending');

-- Function to handle swap acceptance (swaps the reservations)
CREATE OR REPLACE FUNCTION accept_swap_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    swap_request RECORD;
    requester_res RECORD;
    target_res RECORD;
BEGIN
    -- Get the swap request
    SELECT * INTO swap_request FROM reservation_swap_requests WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Swap request not found or not pending';
    END IF;
    
    -- Verify the current user is the target
    IF auth.uid() != swap_request.target_user_id THEN
        RAISE EXCEPTION 'Only the target user can accept this swap request';
    END IF;
    
    -- Get both reservations
    SELECT * INTO requester_res FROM reservations WHERE id = swap_request.requester_reservation_id;
    SELECT * INTO target_res FROM reservations WHERE id = swap_request.target_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'One or both reservations no longer exist';
    END IF;
    
    -- Swap the user_ids on the reservations
    UPDATE reservations SET user_id = swap_request.target_user_id, updated_at = NOW()
    WHERE id = swap_request.requester_reservation_id;
    
    UPDATE reservations SET user_id = swap_request.requester_id, updated_at = NOW()
    WHERE id = swap_request.target_reservation_id;
    
    -- Update the swap request status
    UPDATE reservation_swap_requests 
    SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
    WHERE id = request_id;
    
    -- Cancel any other pending swap requests involving these reservations
    UPDATE reservation_swap_requests 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id != request_id 
    AND status = 'pending'
    AND (requester_reservation_id IN (swap_request.requester_reservation_id, swap_request.target_reservation_id)
         OR target_reservation_id IN (swap_request.requester_reservation_id, swap_request.target_reservation_id));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline a swap request
CREATE OR REPLACE FUNCTION decline_swap_request(request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE reservation_swap_requests 
    SET status = 'declined', responded_at = NOW(), updated_at = NOW()
    WHERE id = request_id 
    AND status = 'pending'
    AND auth.uid() = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Swap request not found, not pending, or you are not the target user';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_swap_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER swap_request_updated_at
    BEFORE UPDATE ON reservation_swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_swap_request_timestamp();
