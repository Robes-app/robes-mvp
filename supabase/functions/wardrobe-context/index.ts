import Anthropic from "npm:@anthropic-ai/sdk@0.52.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Supabase client scoped to the calling user (respects RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { prompt } = await req.json();
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load the user's wardrobe profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, style_icons, budget, wardrobe_description")
    .eq("id", user.id)
    .single();

  const systemPrompt = assembleSystemPrompt(profile);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

  // Persist using the service-role client so RLS insert policy is satisfied
  // (user_id is set explicitly to the authenticated user's id)
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await serviceClient.from("prompt_history").insert({
    user_id: user.id,
    prompt,
    response: responseText,
    tokens_used: tokensUsed,
    model: message.model,
  });

  return new Response(
    JSON.stringify({ response: responseText, tokens_used: tokensUsed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

function assembleSystemPrompt(profile: Record<string, unknown> | null): string {
  const name = profile?.first_name ?? "the user";
  const icons = (profile?.style_icons as string[] | undefined)?.join(", ") || "not yet set";
  const budget = (profile?.budget as string | undefined) || "not specified";
  const wardrobe = (profile?.wardrobe_description as string | undefined) || "not described yet";

  return `You are a personal wardrobe stylist for ${name} on Robes, a thoughtful digital wardrobe app.

Style profile:
- Style icons: ${icons}
- Budget: ${budget}
- Wardrobe: ${wardrobe}

Keep advice specific to their taste and budget. Be direct, warm, and elegant — like a knowledgeable friend, not a catalogue.`;
}
