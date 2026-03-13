-- Add UAN (Universal Account Number / PF Number) to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uan_number TEXT;
