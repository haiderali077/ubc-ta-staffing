-- Drop existing password_reset_tokens table if it exists
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Create new OTP-based password reset table
CREATE TABLE password_reset_otp (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX idx_otp_code ON password_reset_otp(otp_code);
CREATE INDEX idx_otp_user_expires ON password_reset_otp(user_id, expires_at);
CREATE INDEX idx_otp_created ON password_reset_otp(created_at);

-- Function to clean up expired OTPs (optional, can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_otp 
  WHERE expires_at < CURRENT_TIMESTAMP 
    OR used = TRUE 
    OR attempts >= 3;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE password_reset_otp IS 'Stores OTP codes for password reset functionality with 15-minute expiration';