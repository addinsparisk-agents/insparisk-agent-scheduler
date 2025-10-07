import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Schedule {
  id: string;
  user_email: string;
  agent_type: string;
  schedule_time: string;
  timezone: string;
  is_recurring: boolean;
  recurring_pattern: string | null;
  webhook_url: string;
  status: string;
  next_trigger_time: string | null;
  last_triggered: string | null;
}

Deno.serve(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in UTC
    const now = new Date();
    const currentTime = now.toISOString();

    // Find schedules that need to be triggered
    const { data: schedules, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('next_trigger_time', currentTime);

    if (fetchError) {
      console.error('Error fetching schedules:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch schedules' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ message: 'No schedules to trigger' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    // Process each schedule
    for (const schedule of schedules) {
      try {
        console.log(`Triggering webhook for schedule ${schedule.id}`);
        
        // Call the n8n webhook
        const webhookResponse = await fetch(schedule.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schedule_id: schedule.id,
            user_email: schedule.user_email,
            agent_type: schedule.agent_type,
            triggered_at: currentTime,
            timezone: schedule.timezone
          })
        });

        if (webhookResponse.ok) {
          // Update schedule status and calculate next trigger time
          let nextTriggerTime = null;
          
          if (schedule.is_recurring && schedule.recurring_pattern) {
            nextTriggerTime = calculateNextTriggerTime(
              schedule.schedule_time,
              schedule.recurring_pattern,
              schedule.timezone
            );
          }

          const updateData: any = {
            status: 'completed',
            last_triggered: currentTime
          };

          if (nextTriggerTime) {
            updateData.next_trigger_time = nextTriggerTime;
            updateData.status = 'pending'; // Keep as pending for recurring schedules
          }

          const { error: updateError } = await supabase
            .from('schedules')
            .update(updateData)
            .eq('id', schedule.id);

          if (updateError) {
            console.error(`Error updating schedule ${schedule.id}:`, updateError);
          }

          results.push({
            schedule_id: schedule.id,
            status: 'success',
            webhook_status: webhookResponse.status,
            next_trigger_time: nextTriggerTime
          });
        } else {
          // Mark as failed
          await supabase
            .from('schedules')
            .update({ 
              status: 'failed',
              last_triggered: currentTime
            })
            .eq('id', schedule.id);

          results.push({
            schedule_id: schedule.id,
            status: 'failed',
            webhook_status: webhookResponse.status,
            error: 'Webhook call failed'
          });
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('schedules')
          .update({ 
            status: 'failed',
            last_triggered: currentTime
          })
          .eq('id', schedule.id);

        results.push({
          schedule_id: schedule.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${schedules.length} schedules`,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

function calculateNextTriggerTime(
  scheduleTime: string,
  recurringPattern: string,
  timezone: string
): string {
  const baseTime = new Date(scheduleTime);
  let nextTime = new Date(baseTime);

  switch (recurringPattern) {
    case 'daily':
      nextTime.setDate(nextTime.getDate() + 1);
      break;
    case 'weekly':
      nextTime.setDate(nextTime.getDate() + 7);
      break;
    case 'monthly':
      nextTime.setMonth(nextTime.getMonth() + 1);
      break;
    default:
      return null;
  }

  // Check if the next time falls on a weekend or holiday
  // For now, we'll let the database trigger handle business day logic
  // In a production system, you might want to implement more sophisticated logic here
  
  return nextTime.toISOString();
}
