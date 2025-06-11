import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  // Insert a row
  const { data: insertData, error: insertError } = await supabase
    .from("test")
    .insert([{ name: "Local Supabase Test" }])
    .select("*");
  if (insertError) {
    console.error("Insert Error:", insertError);
    return;
  }
  console.log("Inserted:", insertData);

  // Select all rows
  const { data, error } = await supabase.from("test").select("*");
  if (error) {
    console.error("Select Error:", error);
    return;
  }
  console.log("All Rows:", data);
}

test();
