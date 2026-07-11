-- database initialization script

-- 1. Setup schema structure
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_created_by ON items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_metadata ON items USING gin(metadata);

-- 2. Seed initial boilerplate data
-- Insert default admin user:
-- Email: admin@hackathon.com
-- Password: adminpassword (hashed using bcrypt)
INSERT INTO users (email, password, role)
VALUES (
    'admin@hackathon.com',
    '$2a$10$yvE314.yH1m1oJ7s37eWseF.T30DdQgDk0q7Xy3.z.l7dY/Z7V0XW', 
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Insert default standard user:
-- Email: user@hackathon.com
-- Password: userpassword (hashed using bcrypt)
INSERT INTO users (email, password, role)
VALUES (
    'user@hackathon.com',
    '$2a$10$n7/n5Z/2X9vj7R.y4s3lEuM5L0f10e4t.i.l8y3.z.l7dY/Z7V0XW', 
    'user'
)
ON CONFLICT (email) DO NOTHING;

-- Insert placeholder items associated with the admin user
INSERT INTO items (title, description, is_active, metadata, created_by)
VALUES 
(
    'Boilerplate API Configured', 
    'The Express backend connection to PostgreSQL is fully functional and Docker compose setup is complete.', 
    true, 
    '{"category": "infrastructure", "tags": ["docker", "postgres", "node"]}'::jsonb,
    1
),
(
    'Responsive Frontend Template Ready', 
    'HTML5, CSS3, and Vanilla JS UI boilerplate is structured and ready for customizing colors, tabs, and forms.', 
    true, 
    '{"category": "design", "tags": ["vanilla-js", "responsive", "css-variables"]}'::jsonb,
    1
),
(
    'Draft Concept Item', 
    'This is an inactive item illustrating how logical filters work on backend endpoints.', 
    false, 
    '{"category": "concept", "tags": ["draft"]}'::jsonb,
    2
)
ON CONFLICT DO NOTHING;
