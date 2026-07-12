-- SQL Migration: Create TransitOps Smart Transport Operations tables

-- 1. Create Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., Truck, Van, Sedan, Bus
    max_capacity NUMERIC(10, 2) NOT NULL, -- in kg
    odometer NUMERIC(12, 2) NOT NULL, -- in km
    acquisition_cost NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available' NOT NULL CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Trigger for updating vehicles updated_at
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 2. Create Drivers table
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

-- Trigger for updating drivers updated_at
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 3. Create Trips table
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

-- Trigger for updating trips updated_at
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 4. Create Maintenance Logs table
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

-- Trigger for updating maintenance updated_at
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 5. Create Fuel Logs table
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

-- Trigger for updating fuel updated_at
CREATE TRIGGER update_fuel_updated_at
    BEFORE UPDATE ON fuel_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 6. Create Expenses table
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

-- Trigger for updating expenses updated_at
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
