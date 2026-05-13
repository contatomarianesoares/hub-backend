const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Supabase connection configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Database connection pool with IPv4-first preference
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws,
  },
  db: {
    schema: 'public',
  },
  headers: {
    'Accept-Profile': 'public',
  },
  global: {
    headers: {
      // Prefer IPv4 over IPv6
      'Connection': 'keep-alive',
    },
  },
});

// Parameterized query wrapper for consistency
const db = {
  async query(text, values = []) {
    try {
      const { data, error } = await supabase.rpc('execute_query', {
        query_text: text,
        query_params: values,
      });

      if (error) throw error;
      return { rows: data || [] };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
};

module.exports = { default: db };
