const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Supabase connection configuration
const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key if it's a real JWT (starts with "eyJ"), otherwise fall back to anon key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseKey = (serviceKey.startsWith('eyJ') ? serviceKey : null) || process.env.SUPABASE_ANON_KEY;

// Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws,
  },
  db: {
    schema: 'public',
  },
});

module.exports = { default: supabase, supabase };
