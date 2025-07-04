import { createClient } from "@supabase/supabase-js";


// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = "https://lzjataingetxxbfzvdrw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6amF0YWluZ2V0eHhiZnp2ZHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5ODYwMzIsImV4cCI6MjA2MDU2MjAzMn0.ceEzAL1wC7hTpR2CLKK8dOuWmRpYso6K6obcwBQy5No"
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);