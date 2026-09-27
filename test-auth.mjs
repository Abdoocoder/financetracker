import { createClient } from '@supabase/supabase-js';
const supabase = createClient('http://127.0.0.1:54321', 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH');
const result = await supabase.auth.signInWithPassword({ email: 'e2e-test@local.com', password: 'TestPass123!' });
console.log('Result:', JSON.stringify(result, null, 2));
