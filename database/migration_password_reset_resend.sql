-- Add resend tracking to password_resets for rate-limited resend feature
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS resend_count INTEGER DEFAULT 0;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP DEFAULT NOW();
