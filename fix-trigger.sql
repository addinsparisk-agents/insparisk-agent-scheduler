-- Step 1: Find all triggers on the schedules table
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgrelid = 'schedules'::regclass 
  AND tgisinternal = false;

-- Step 2: Once you find the trigger name(s), disable them using:
-- ALTER TABLE schedules DISABLE TRIGGER <actual_trigger_name>;

-- Step 3: Or disable ALL triggers on the table:
-- ALTER TABLE schedules DISABLE TRIGGER ALL;

-- Step 4: To re-enable later:
-- ALTER TABLE schedules ENABLE TRIGGER ALL;
