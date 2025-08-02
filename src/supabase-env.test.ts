import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@jest/globals";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

test("can access Supabase events table", async () => {
  console.log("ENV URL", process.env.SUPABASE_URL);
  console.log("ENV KEY", process.env.SUPABASE_ANON_KEY);
  console.log("SUPABASE", supabase);

  const { data, error } = await supabase.from("events").select("*").limit(1);
  console.log("data:", data);
  console.log("error:", error);
  expect(error).toBeNull();
});