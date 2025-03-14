-- Create the function to update user subscription in a transaction
CREATE OR REPLACE FUNCTION update_user_subscription(
  p_user_id UUID,
  p_plan_type TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Update or insert subscription record
    INSERT INTO subscriptions (
      user_id,
      plan_type,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      current_period_start,
      current_period_end
    ) VALUES (
      p_user_id,
      p_plan_type,
      'active',
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_current_period_start,
      p_current_period_end
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_type = EXCLUDED.plan_type,
      status = EXCLUDED.status,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = NOW();

    -- Update user's premium status
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('is_premium', true)
        ELSE 
          raw_user_meta_data || jsonb_build_object('is_premium', true)
      END
    WHERE id = p_user_id;

    -- If we get here, commit the transaction
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- If we get here, rollback the transaction
    ROLLBACK;
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 