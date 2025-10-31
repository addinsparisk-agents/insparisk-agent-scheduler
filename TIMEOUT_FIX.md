# Statement Timeout Fix

## Problem
Getting error `57014: canceling statement due to statement timeout` when creating schedules.

## Root Cause
The database has a trigger that calls `calculate_next_trigger_time()` function on insert. This function performs complex business day calculations that exceed the default statement timeout.

## Client-Side Fix (Applied)
✅ Modified `index.html` to explicitly provide `next_trigger_time` and `status` fields in the insert statement. This may help bypass or speed up the trigger.

## Database-Side Fixes (If Issue Persists)

### Option 1: Disable the Auto-Trigger (Recommended)
Since we're now calculating `next_trigger_time` on the client side, you can disable the database trigger:

```sql
-- Find the trigger name
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgrelid = 'schedules'::regclass;

-- Drop the trigger (replace 'trigger_name' with actual name)
DROP TRIGGER IF EXISTS trigger_name ON schedules;
```

### Option 2: Increase Statement Timeout
Increase the timeout for the schedules table operations:

```sql
-- Set a longer timeout for the function
ALTER FUNCTION calculate_next_trigger_time() SET statement_timeout = '10s';

-- Or set it at the database level
ALTER DATABASE postgres SET statement_timeout = '10s';
```

### Option 3: Optimize the Trigger Function
Make the `calculate_next_trigger_time()` function only run when `next_trigger_time` is NULL:

```sql
CREATE OR REPLACE FUNCTION set_next_trigger_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if not provided
  IF NEW.next_trigger_time IS NULL THEN
    NEW.next_trigger_time := calculate_next_trigger_time(
      NEW.schedule_time,
      NEW.recurring_pattern,
      NEW.timezone
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Option 4: Make Trigger Async (Advanced)
Convert the trigger to run asynchronously using pg_background or similar extension.

## Testing
After applying the client-side fix, try creating a schedule again. If it still times out, apply one of the database-side fixes above.

## Monitoring
Check Supabase logs to see if the trigger is still executing and how long it takes:
1. Go to Supabase Dashboard → Database → Logs
2. Look for queries related to `schedules` table
3. Check execution time
