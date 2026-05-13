const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Supabase connection configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
