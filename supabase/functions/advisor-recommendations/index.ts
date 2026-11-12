import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleAdvisor } from "./handler.mjs";

Deno.serve(handleAdvisor);
