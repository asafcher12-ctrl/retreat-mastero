const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.MANAGER_EMAIL || 'asafcher12@gmail.com';
const password = process.env.MANAGER_PASSWORD || 'TempPass123!';
const eventName = process.env.EVENT_NAME || 'Retreat Kinneret';

if (!url || !serviceRoleKey) {
  throw new Error('Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function findUserByEmail(targetEmail) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase()) || null;
}

async function ensureUser() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: 'Asaf Cher',
      },
    });

    if (error) {
      throw error;
    }

    return data.user;
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.toLowerCase().includes('already') && !message.toLowerCase().includes('exists')) {
      throw error;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} already exists, but could not be found in admin list`);
    }

    return user;
  }
}

async function main() {
  const user = await ensureUser();

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || 'Asaf Cher',
        is_event_manager: true,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    throw profileError;
  }

  const { data: createdEvent, error: eventError } = await supabase
    .from('events')
    .insert({
      name: eventName,
      starts_at: null,
      created_by: user.id,
    })
    .select('id, invite_code')
    .single();

  if (eventError) {
    throw eventError;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('event_members')
    .upsert(
      {
        event_id: createdEvent.id,
        user_id: user.id,
        role: 'manager',
      },
      { onConflict: 'event_id,user_id' }
    )
    .select('role')
    .single();

  if (membershipError) {
    throw membershipError;
  }

  console.log(JSON.stringify({
    email,
    password,
    userId: user.id,
    eventId: createdEvent.id,
    inviteCode: createdEvent.invite_code,
    role: membership.role,
  }, null, 2));
}

main().catch((error) => {
  console.error('Failed to create manager account and event');
  console.error(error);
  process.exit(1);
});
