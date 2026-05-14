import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  headers: {
    'Accept-Profile': 'public',
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
    },
  },
});

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

export default db;
