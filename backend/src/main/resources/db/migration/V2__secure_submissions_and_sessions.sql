ALTER TABLE product ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN contact_name VARCHAR(120);
ALTER TABLE orders ADD COLUMN contact_phone VARCHAR(10);
ALTER TABLE orders ADD COLUMN contact_email VARCHAR(254);
ALTER TABLE orders ADD COLUMN contact_address VARCHAR(500);
ALTER TABLE orders ADD COLUMN shipping_method VARCHAR(20);
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE order_item ADD COLUMN stock_reserved BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE client_request ADD COLUMN contact_name VARCHAR(120);
ALTER TABLE client_request ADD COLUMN contact_phone VARCHAR(10);
ALTER TABLE client_request ADD COLUMN contact_email VARCHAR(254);
ALTER TABLE client_request ADD COLUMN contact_address VARCHAR(500);
ALTER TABLE client_request ALTER COLUMN user_id DROP NOT NULL;

-- Preserve the last known contact details before profiles can be edited again.
UPDATE orders o SET contact_name = u.name, contact_phone = u.phone,
    contact_email = u.email, contact_address = u.address FROM users u WHERE o.user_id = u.id;
UPDATE client_request r SET contact_name = u.name, contact_phone = u.phone,
    contact_email = u.email, contact_address = u.address FROM users u WHERE r.user_id = u.id;

-- Guest phone numbers are not verified account ownership. Preserve their records as anonymous history.
UPDATE orders SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE role = 'GUEST');
UPDATE client_request SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE role = 'GUEST');

CREATE TABLE auth_session (
    id VARCHAR(36) PRIMARY KEY, subject VARCHAR(120) NOT NULL, role VARCHAR(20) NOT NULL,
    user_id BIGINT, refresh_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, revoked BOOLEAN NOT NULL
);
CREATE INDEX idx_auth_session_expiry ON auth_session(expires_at);
CREATE TABLE submission_key (
    id VARCHAR(64) PRIMARY KEY, fingerprint VARCHAR(64) NOT NULL,
    receipt_id VARCHAR(80), receipt_type VARCHAR(20), created_at TIMESTAMP
);

-- Payload fingerprints were not stored by the old application. Reserve historical keys
-- with a sentinel fingerprint so a retry cannot silently create a second historical order.
INSERT INTO submission_key(id, fingerprint, receipt_id, receipt_type, created_at)
SELECT encode(sha256(convert_to('guest:' || idempotency_key, 'UTF8')), 'hex'),
       repeat('0', 64), id, 'ORDER', created_at FROM orders WHERE idempotency_key IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO submission_key(id, fingerprint, receipt_id, receipt_type, created_at)
SELECT encode(sha256(convert_to('user:' || user_id || ':' || idempotency_key, 'UTF8')), 'hex'),
       repeat('0', 64), id, 'ORDER', created_at FROM orders WHERE idempotency_key IS NOT NULL AND user_id IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO submission_key(id, fingerprint, receipt_id, receipt_type, created_at)
SELECT encode(sha256(convert_to('guest:' || idempotency_key, 'UTF8')), 'hex'),
       repeat('0', 64), id, type, created_at FROM client_request WHERE idempotency_key IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO submission_key(id, fingerprint, receipt_id, receipt_type, created_at)
SELECT encode(sha256(convert_to('user:' || user_id || ':' || idempotency_key, 'UTF8')), 'hex'),
       repeat('0', 64), id, type, created_at FROM client_request WHERE idempotency_key IS NOT NULL AND user_id IS NOT NULL
ON CONFLICT DO NOTHING;
