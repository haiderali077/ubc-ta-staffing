IF NOT EXISTS (
    SELECT * FROM sysobjects WHERE name='system_flags' AND xtype='U'
)
BEGIN
    CREATE TABLE system_flags (
        flag_name VARCHAR(255) PRIMARY KEY,
        flag_value BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- Upsert logic
IF EXISTS (SELECT * FROM system_flags WHERE flag_name = 'load_dummy_data')
BEGIN
    UPDATE system_flags SET flag_value = 1 WHERE flag_name = 'load_dummy_data';
END
ELSE
BEGIN
    INSERT INTO system_flags (flag_name, flag_value) VALUES ('load_dummy_data', 1);
END;

-- Notify (use PRINT in T-SQL)
PRINT 'Dummy data flag initialized - application will check and load data if needed';