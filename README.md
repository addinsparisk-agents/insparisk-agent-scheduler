# Insparisk Agent Scheduler

A modern web application for scheduling n8n workflow agents with intelligent business day detection and US holiday integration.

## Features

- 🤖 **Agent Selection**: Choose between Accounts Receivable and Boiler Quote agents
- 📅 **Smart Scheduling**: Automatically skips weekends and US federal holidays
- 🔄 **Recurring Schedules**: Support for daily, weekly, and monthly recurring schedules
- 🌍 **Timezone Support**: Full timezone support with America/New_York as default
- 📊 **Real-time Status**: Track schedule status and next trigger times
- 🎨 **Modern UI**: Clean, responsive design with gradient backgrounds

## Architecture

- **Frontend**: Vanilla HTML/CSS/JavaScript with Supabase client
- **Backend**: Supabase (Database + Edge Functions)
- **Deployment**: Render (Static Site)
- **Webhooks**: n8n workflow integration

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations provided in the conversation
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy schedule-webhook-trigger
   ```
4. Set up a cron job to call the Edge Function every minute:
   ```sql
   -- Create a cron job (if using pg_cron extension)
   SELECT cron.schedule('trigger-schedules', '* * * * *', 'SELECT net.http_post(url:=''https://your-project.supabase.co/functions/v1/schedule-webhook-trigger'', headers:=''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb);');
   ```

### 2. Configure the Web Application

1. Update the Supabase configuration in `index.html`:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```

### 3. Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Static Site
3. Use the following settings:
   - **Build Command**: `npm install`
   - **Publish Directory**: `.` (root)
   - **Start Command**: `npm start`

## Database Schema

The application uses the following main tables:

- `schedules`: Stores user scheduling preferences
- `us_holidays`: Contains US federal holidays for business day detection

## Edge Function

The `schedule-webhook-trigger` Edge Function:
- Runs every minute via cron job
- Finds schedules ready to be triggered
- Calls the appropriate n8n webhook
- Updates schedule status and calculates next trigger time
- Handles business day logic for recurring schedules

## n8n Webhook Integration

The system sends the following payload to your n8n webhooks:

```json
{
  "schedule_id": "uuid",
  "user_email": "user@example.com",
  "agent_type": "accounts_receivable|boiler_quote",
  "triggered_at": "2024-01-15T09:00:00Z",
  "timezone": "America/New_York"
}
```

## Business Day Logic

The system automatically:
- Skips weekends (Saturday and Sunday)
- Skips US federal holidays
- Adjusts recurring schedules to the next business day
- Preserves the original time when moving to business days

## Environment Variables

For the Edge Function, ensure these are set:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Support

For issues or questions, please contact the development team.
