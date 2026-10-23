import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from './config';

// 설정이 없을 때도 화면이 뜨도록 가짜 주소로 만들고, App에서 설정 안내를 보여 줘요.
export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'http://localhost:54321',
  isConfigured ? SUPABASE_ANON_KEY : 'missing-key',
  { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } },
);
