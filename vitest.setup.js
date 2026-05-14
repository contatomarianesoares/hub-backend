import { vi } from 'vitest';

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key-12345678';
process.env.TWILIO_ACCOUNT_SID = 'test-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-token';
process.env.EVOLUTION_API_URL = 'http://localhost:8080';
process.env.EVOLUTION_API_KEY = 'test-key';

// Suppress module warnings
vi.stubGlobal('console.warn', vi.fn());
