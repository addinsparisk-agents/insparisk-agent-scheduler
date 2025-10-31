# Webhook Trigger Setup Guide

## How It Works

1. **Schedules are stored** in Supabase with `next_trigger_time`
2. **Cron job calls** the Edge Function every minute (or 5 minutes)
3. **Edge Function checks** for schedules where `next_trigger_time` ≤ now
4. **Webhooks are triggered** for matching schedules
5. **Next trigger time is calculated** for recurring schedules

## Setup Options

### Option A: pg_cron (Recommended)

**Pros:** Built into Supabase, runs every minute, reliable
**Cons:** Requires SQL setup

**Steps:**

1. Get your Service Role Key:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Settings → API → Copy "service_role" key

2. Run this SQL in Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to run every minute
SELECT cron.schedule(
  'trigger-schedules',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://vxhmqlavlukdsfcqnllu.supabase.co/functions/v1/schedule-webhook-trigger',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

3. Replace `YOUR_SERVICE_ROLE_KEY` with your actual key

4. Verify it's running:
```sql
SELECT * FROM cron.job;
```

---

### Option B: Cron-job.org (Easiest)

**Pros:** No setup, free, reliable, runs every minute
**Cons:** External service dependency

**Steps:**

1. Go to https://cron-job.org and create a free account

2. Create a new cron job:
   - **Title:** Trigger Insparisk Schedules
   - **URL:** `https://vxhmqlavlukdsfcqnllu.supabase.co/functions/v1/schedule-webhook-trigger`
   - **Schedule:** Every 1 minute
   - **Request Method:** POST
   - **Request Headers:**
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```

3. Save and enable the job

---

### Option C: GitHub Actions (Included)

**Pros:** Version controlled, free for public repos
**Cons:** Minimum 5-minute interval, less reliable timing

**Steps:**

1. Add your Service Role Key as a GitHub Secret:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your service role key from Supabase

2. The workflow file is already created at `.github/workflows/trigger-schedules.yml`

3. Push to GitHub and it will run automatically every 5 minutes

4. You can also trigger it manually:
   - Go to Actions tab → Trigger Scheduled Webhooks → Run workflow

---

## Testing

### Test the Edge Function Manually

```bash
curl -X POST \
  https://vxhmqlavlukdsfcqnllu.supabase.co/functions/v1/schedule-webhook-trigger \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Check Logs

1. Go to Supabase Dashboard → Edge Functions → schedule-webhook-trigger
2. Click "Logs" to see execution history
3. Look for successful webhook calls

### Verify Schedule Updates

```sql
SELECT id, agent_type, next_trigger_time, last_triggered, status
FROM schedules
ORDER BY next_trigger_time;
```

---

## Troubleshooting

### Webhooks not triggering?

1. Check Edge Function logs for errors
2. Verify `next_trigger_time` is in the past
3. Verify schedule status is 'pending'
4. Test webhook URL manually with curl

### Cron job not running?

**For pg_cron:**
```sql
-- Check if job exists
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule if needed
SELECT cron.unschedule('trigger-schedules');
```

**For external services:**
- Check service dashboard for execution logs
- Verify API key is correct
- Check for rate limits

---

## Recommendation

**Start with Option B (cron-job.org)** - it's the easiest and most reliable for testing.

Once you confirm everything works, you can switch to **Option A (pg_cron)** for a fully self-contained solution.
