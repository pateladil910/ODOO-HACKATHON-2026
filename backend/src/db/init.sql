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

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create standard custom update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    max_capacity NUMERIC(10, 2) NOT NULL, -- in kg
    odometer NUMERIC(12, 2) NOT NULL, -- in km
    acquisition_cost NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available' NOT NULL CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_category VARCHAR(50) NOT NULL,
    license_expiry_date DATE NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    safety_score NUMERIC(5, 2) DEFAULT 100.00 NOT NULL,
    status VARCHAR(50) DEFAULT 'Available' NOT NULL CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Trips table
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id INT REFERENCES drivers(id) ON DELETE RESTRICT,
    cargo_weight NUMERIC(10, 2) NOT NULL,
    planned_distance NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
    revenue NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Maintenance Logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' NOT NULL CHECK (status IN ('Active', 'Closed')),
    logged_at DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_logs(status);

CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Fuel Logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
    liters NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    logged_at DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON fuel_logs(vehicle_id);

CREATE TRIGGER update_fuel_updated_at
    BEFORE UPDATE ON fuel_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- e.g. Tolls, Permit, Insurance, Other
    cost NUMERIC(15, 2) NOT NULL,
    logged_at DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 2. Seed initial data
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

-- Seed target users
INSERT INTO users (email, password, role)
VALUES 
('manager@transitops.com', '$2a$10$yvE314.yH1m1oJ7s37eWseF.T30DdQgDk0q7Xy3.z.l7dY/Z7V0XW', 'fleet_manager'),
('driver@transitops.com', '$2a$10$yvE314.yH1m1oJ7s37eWseF.T30DdQgDk0q7Xy3.z.l7dY/Z7V0XW', 'driver'),
('safety@transitops.com', '$2a$10$yvE314.yH1m1oJ7s37eWseF.T30DdQgDk0q7Xy3.z.l7dY/Z7V0XW', 'safety_officer'),
('analyst@transitops.com', '$2a$10$yvE314.yH1m1oJ7s37eWseF.T30DdQgDk0q7Xy3.z.l7dY/Z7V0XW', 'financial_analyst')
ON CONFLICT (email) DO NOTHING;


-- Seed Vehicles
INSERT INTO vehicles (registration_number, model, type, max_capacity, odometer, acquisition_cost, status)
VALUES
('VAN-01', 'Ford Transit 2022', 'Van', 1200.00, 45200.50, 32000.00, 'Available'),
('VAN-02', 'Mercedes Sprinter 2023', 'Van', 1500.00, 18400.20, 45000.00, 'Available'),
('VAN-03', 'Nissan NV2500 2021', 'Van', 1000.00, 85600.00, 28000.00, 'On Trip'),
('VAN-05', 'Chevrolet Express 2020', 'Van', 500.00, 112000.10, 24000.00, 'Available'),
('TRUCK-01', 'Volvo FH16 Heavy Duty', 'Truck', 18000.00, 254100.80, 115000.00, 'Available'),
('TRUCK-02', 'Scania R500 Flatbed', 'Truck', 15000.00, 142300.00, 98000.00, 'In Shop'),
('SEDAN-01', 'Toyota Prius Hybrid', 'Sedan', 350.00, 62000.40, 22000.00, 'Retired'),
('BUS-01', 'Electric Shuttle Bus 2024', 'Bus', 8000.00, 1200.50, 150000.00, 'Available');


-- Seed Drivers
INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
VALUES
('Alex Mercer', 'DL-98214532', 'Class B Commercial', '2027-10-15', '+1-555-0199', 95.50, 'Available'),
('Bob Builder', 'DL-88241242', 'Class A Commercial', '2028-03-22', '+1-555-0144', 98.00, 'Available'),
('Charlie Cox', 'DL-72314152', 'Class B Commercial', '2027-08-01', '+1-555-0185', 92.00, 'On Trip'),
('Daniel Craig', 'DL-61245152', 'Standard Class C', '2025-01-01', '+1-555-0112', 88.50, 'Off Duty'), -- Expired License (to check compliance rules)
('Emily Blunt', 'DL-55246261', 'Class A Commercial', '2029-06-18', '+1-555-0131', 97.20, 'Available'),
('Frank Castle', 'DL-44125251', 'Class B Commercial', '2027-12-05', '+1-555-0177', 74.00, 'Suspended'),
('George Clark', 'DL-33246162', 'Class A Commercial', '2028-11-20', '+1-555-0155', 99.00, 'Available');


-- Seed Trips
INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, revenue)
VALUES
('Warehouse A (Chicago)', 'Distribution Center (Detroit)', 1, 1, 950.00, 450.00, 'Completed', 1800.00),
('HQ Terminal (New York)', 'Retail Store B (Boston)', 2, 2, 1200.00, 340.00, 'Completed', 1450.00),
('Factory Plaza (Dallas)', 'Shipping Hub (Houston)', 3, 3, 850.00, 260.00, 'Dispatched', 1100.00),
('Warehouse B (Seattle)', 'Local Center (Tacoma)', 4, 5, 450.00, 50.00, 'Draft', 300.00);


-- Seed Maintenance Logs
INSERT INTO maintenance_logs (vehicle_id, description, cost, status, logged_at)
VALUES
(6, 'Engine Overhaul and spark plug replacement', 1850.00, 'Active', '2026-07-10'),
(1, 'Scheduled oil change and tire rotation', 150.00, 'Closed', '2026-06-15'),
(2, 'Brake pad replacement and brake fluid flush', 450.00, 'Closed', '2026-07-01');


-- Seed Fuel Logs
INSERT INTO fuel_logs (vehicle_id, liters, cost, logged_at)
VALUES
(1, 120.00, 180.00, '2026-07-01'),
(1, 130.00, 195.00, '2026-07-10'),
(2, 90.00, 135.00, '2026-07-02'),
(2, 95.00, 142.50, '2026-07-09'),
(3, 80.00, 120.00, '2026-07-08'),
(4, 40.00, 60.00, '2026-07-05'),
(5, 450.00, 675.00, '2026-07-04');


-- Seed Operational Expenses
INSERT INTO expenses (vehicle_id, type, cost, logged_at)
VALUES
(1, 'Tolls', 45.00, '2026-07-01'),
(2, 'Tolls', 30.00, '2026-07-02'),
(3, 'Tolls', 25.00, '2026-07-08'),
(5, 'Permits', 150.00, '2026-07-04');
