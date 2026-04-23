import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Direct Gemini API via Google AI Studio ---
async function callGemini(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const useOnspaceAI = !apiKey || apiKey.trim() === "";

  if (useOnspaceAI) {
    // Fallback: OnSpace AI proxy (OpenAI-compatible)
    const baseUrl = Deno.env.get("ONSPACE_AI_BASE_URL") || "https://ai.onspace.ai/v1";
    const onspaceKey = Deno.env.get("ONSPACE_AI_API_KEY") || "";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${onspaceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.7, max_tokens: 4096,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Primary: Direct Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const generationConfig: any = { temperature: 0.7, maxOutputTokens: 4096 };
  if (jsonMode) generationConfig.responseMimeType = "application/json";

  const body = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ],
    generationConfig,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function cleanJSON(raw: string): any {
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const { type, language = "fr" } = body;

    console.log(`[vital-ai] Request type: ${type}, language: ${language}`);

    // ==================== BIOMARKER ANALYSIS ====================
    if (type === "biomarker_analysis") {
      const { biomarkers, profile } = body;
      const systemPrompt = `Tu es un médecin expert en médecine fonctionnelle, endocrinologie et nutrition clinique.
Analyse les biomarqueurs fournis selon les normes EBM les plus récentes (JAMA, NEJM, Lancet).
Tu dois répondre en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.
RETOURNE UNIQUEMENT UN OBJET JSON VALIDE, sans markdown ni texte autour.`;

      const userPrompt = `PROFIL PATIENT: ${JSON.stringify(profile)}
BIOMARQUEURS: ${JSON.stringify(biomarkers)}

Analyse complète. Format JSON exact:
{
  "health_score": <integer 0-100>,
  "vitality_score": <integer 0-100>,
  "summary": "<résumé clinique en 2-3 phrases>",
  "alerts": [
    {"marker": "<nom>", "status": "<critical|low|high|optimal>", "recommendation": "<action précise>"}
  ],
  "nutrition_adjustments": ["<conseil nutrition 1>", "<conseil 2>"],
  "training_adjustments": ["<ajustement entraînement 1>"],
  "supplements": [
    {"name": "<supplément>", "dose": "<dosage précis>", "timing": "<moment>", "evidence": "<source>"}
  ],
  "local_foods": ["<aliment local recommandé 1>", "<aliment 2>"],
  "lifestyle_tips": ["<conseil lifestyle 1>"]
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);

      // Save to DB
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          await supabase.from("ai_analyses").upsert({
            user_id: user.id, type: "biomarker_analysis",
            input_data: { biomarkers, profile },
            result,
          }, { onConflict: "user_id,type" }).catch(console.error);

          // Save health score history
          await supabase.from("health_score_history").upsert({
            user_id: user.id,
            score: result.health_score || result.vitality_score || 70,
            date: new Date().toISOString().split("T")[0],
          }, { onConflict: "user_id,date" }).catch(console.error);
        }
      }

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== PDF ANALYSIS ====================
    if (type === "pdf_analysis") {
      const { pdfBase64 } = body;

      const systemPrompt = `Tu es un médecin biologiste expert en interprétation de bilans sanguins.
Analyse le contenu de ce bilan de laboratoire (tunisien ou international).
Tu dois répondre en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.
RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;

      const userPrompt = `Analyse ce bilan biologique (base64 du PDF/image): ${pdfBase64.substring(0, 2000)}...

Extrait les valeurs et retourne:
{
  "lab_name": "<nom du laboratoire ou null>",
  "lab_date": "<date YYYY-MM-DD ou null>",
  "patient_name": "<nom du patient ou null>",
  "summary": "<résumé en 2-3 phrases des résultats clés>",
  "markers": [
    {
      "name": "<nom du marqueur en français>",
      "nameAr": "<nom en arabe>",
      "value": <valeur numérique>,
      "unit": "<unité>",
      "normalMin": <valeur min normale>,
      "normalMax": <valeur max normale>,
      "status": "<optimal|low|high|critical>",
      "category": "<hormones|vitamins|metabolic>"
    }
  ]
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== MEAL PLAN ====================
    if (type === "meal_plan") {
      const { biomarkers, profile, country = "TN" } = body;
      
      const countryFoods: Record<string, string> = {
        TN: "Couscous, Lablabi, Brik, Merguez, Harissa, Chorba, Maklouba, Dattes Deglet Nour, Huile d'olive tunisienne",
        MA: "Tagine, Couscous marocain, Harira, Pastilla, Chermoula, Argan oil, Smen",
        DZ: "Chakhchoukha, Berkoukes, Rechta, Garantita, Hammar el laham",
        FR: "Boeuf bourguignon, Quiche, Ratatouille, Salade niçoise, Fromages AOP",
        SA: "Kabsa, Jareesh, Mutabbaq, Madfoon, Dates Medjool",
        AE: "Harees, Madrooba, Al Harees, Dates, Camel milk",
        TR: "Kebab, Mercimek çorbası, Dolma, Lahmacun, Ayran, Börek",
        GR: "Moussaka, Souvlaki, Hummus, Tzatziki, Spanakopita, Olive oil",
        LB: "Mezze, Tabbouleh, Kibbeh, Fattoush, Hummus bil lahme",
        EG: "Koshari, Ful medames, Molokhia, Feteer, Om Ali",
      };

      const deficiencies = (biomarkers || []).filter((b: any) => b.value < b.normal_min);
      const localFoods = countryFoods[country] || countryFoods.TN;

      const systemPrompt = `Tu es un nutritionniste expert en nutrition sportive et médecine fonctionnelle.
Crée un plan de repas pour UNE JOURNÉE complet, adapté aux biomarqueurs et carences de l'utilisateur.
Inclus des aliments locaux de ${country}.
Tu dois répondre en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.
RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;

      const userPrompt = `PROFIL: ${JSON.stringify(profile)}
CARENCES DÉTECTÉES: ${JSON.stringify(deficiencies.map((d: any) => d.name))}
ALIMENTS LOCAUX DISPONIBLES: ${localFoods}
TDEE estimé: ${profile.tdee || 2200} kcal

Format JSON exact:
{
  "totalCalories": <integer>,
  "macros": {"protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>},
  "breakfast": {
    "name": "<nom>", "nameAr": "<اسم عربي>",
    "calories": <int>, "protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>,
    "prepTime": <minutes>, "image": "meal-1",
    "ingredients": ["<ingrédient 1>", ...], "ingredientsAr": ["<مكون>", ...],
    "instructions": ["<étape 1>", ...], "instructionsAr": ["<خطوة>", ...],
    "tags": ["<tag1>", "<tag2>"]
  },
  "lunch": { <même structure> },
  "dinner": { <même structure> },
  "snack": { <même structure> }
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);
      if (result.breakfast) result.breakfast.image = "meal-1";
      if (result.lunch) result.lunch.image = "meal-2";
      if (result.dinner) result.dinner.image = "meal-3";
      if (result.snack) result.snack.image = "meal-1";

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== COUNTRY RECIPES ====================
    if (type === "country_recipes") {
      const { countryCode, category, profile: userProfile } = body;
      
      const systemPrompt = `Tu es un chef cuisinier et nutritionniste expert en cuisine mondiale.
Génère des recettes authentiques et détaillées avec macros précis.
Réponds en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.
RETOURNE UNIQUEMENT UN TABLEAU JSON VALIDE.`;

      const userPrompt = `Génère 4-5 recettes authentiques de ${countryCode} dans la catégorie "${category}".
Profil utilisateur: ${JSON.stringify(userProfile)}

Format JSON (tableau):
[{
  "id": "<id unique>",
  "name": "<nom de la recette>",
  "nameAr": "<اسم بالعربي>",
  "country": "${countryCode}",
  "category": "${category}",
  "calories": <int per serving>,
  "protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>,
  "prepTime": <minutes>,
  "difficulty": "<easy|medium|hard>",
  "servings": <int>,
  "image": "meal-1",
  "ingredients": ["<ingrédient précis>"],
  "ingredientsAr": ["<مكون>"],
  "instructions": ["<étape 1>"],
  "instructionsAr": ["<خطوة>"],
  "healthBenefits": ["<bénéfice 1>"],
  "tags": ["<tag>"]
}]`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      // Parse array
      const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const result = JSON.parse(text.slice(start, end + 1));
      const withImages = result.map((r: any, i: number) => ({ ...r, image: `meal-${(i % 3) + 1}` }));

      return new Response(JSON.stringify({ data: withImages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== TRAINING PLAN ====================
    if (type === "training_plan") {
      const { profile: userProfile, workout_type = "hypertrophy", split_type = "upper_lower" } = body;

      const splitDescriptions: Record<string, string> = {
        upper_lower: "Upper/Lower Split: alternance haut du corps / bas du corps sur 4 jours",
        ppl: "Push/Pull/Legs: poussée (pectoraux, épaules, triceps), tirage (dos, biceps), jambes",
        arnold: "Arnold Split: poitrine+dos / épaules+bras / jambes sur 3 jours × 2",
        anterior_posterior: "Anterior/Posterior: muscles antérieurs vs postérieurs, focus sur chaînes musculaires",
        full_body: "Full Body: tout le corps à chaque séance, fréquence élevée par muscle",
        bro_split: "Bro Split: 1 muscle par jour sur 5-6 jours",
      };

      const typeDescriptions: Record<string, string> = {
        hypertrophy: "Hypertrophie: 8-12 reps, 70-80% 1RM, repos 60-90s (Schoenfeld 2010)",
        strength: "Force: 3-6 reps, 85-95% 1RM, repos 3-5 min (Kraemer & Ratamess 2004)",
        endurance: "Endurance musculaire: 15-20 reps, 50-60% 1RM, repos 30-45s",
        longevity: "Longévité: focus mobilité, stabilité, mouvements fonctionnels (NSCA 2021)",
        recovery: "Récupération active: intensité légère, étirements, mobilité",
      };

      const systemPrompt = `Tu es un coach personnel NSCA-CSCS expert en science de l'entraînement.
Génère un programme de séance basé sur les données scientifiques les plus récentes.
Programme: ${splitDescriptions[split_type] || split_type}
Type: ${typeDescriptions[workout_type] || workout_type}
Réponds en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.
RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;

      const userPrompt = `PROFIL ATHLÈTE: ${JSON.stringify(userProfile)}
SPLIT: ${split_type} | TYPE: ${workout_type}

Génère UNE séance complète avec 5-7 exercices détaillés. Format JSON:
{
  "type": "${workout_type}",
  "name": "<nom de la séance>",
  "duration": <minutes>,
  "warmup": "<échauffement détaillé 5 min>",
  "cooldown": "<retour au calme>",
  "scienceTip": "<conseil scientifique sourcé en français>",
  "scienceTipAr": "<نصيحة علمية بالعربي>",
  "exercises": [
    {
      "id": "<unique>",
      "name": "<nom exercice>",
      "nameAr": "<اسم بالعربي>",
      "muscleGroup": "<muscle principal>",
      "muscleGroupSecondary": "<muscle secondaire>",
      "sets": <int>,
      "reps": "<ex: 8-10 ou 12>",
      "rest": <secondes>,
      "intensity": "<high|medium|low>",
      "technique": "<cue technique précis>",
      "tempo": "<ex: 3-1-2-0 excentrique-isométrie-concentrique-pause>",
      "rir": <repetitions in reserve 0-4>,
      "progression": "<règle de progression hebdomadaire>"
    }
  ]
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== AI CHAT ====================
    if (type === "chat") {
      const { message, history = [], systemContext } = body;

      const systemPrompt = systemContext || `Tu es VitalCore AI, un assistant santé expert en médecine factuelle.
Réponds de façon précise, chaleureuse et basée sur des preuves scientifiques.
Réponds en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.`;

      // Build conversation for Gemini
      const historyText = history.slice(-6).map((h: any) =>
        `${h.role === "user" ? "Utilisateur" : "Assistant"}: ${h.content}`
      ).join("\n");

      const fullPrompt = historyText
        ? `${historyText}\n\nUtilisateur: ${message}\n\nAssistant:`
        : message;

      // Chat mode — no JSON, plain text
      const raw = await callGemini(systemPrompt, fullPrompt, false);
      const content = raw.trim();

      return new Response(JSON.stringify({ data: { content, role: "assistant" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== WORKOUT LOG ANALYSIS ====================
    if (type === "workout_log_analysis") {
      const { logs, profile: userProfile } = body;

      const systemPrompt = `Tu es un coach expert en analyse de la performance et progression en musculation.
Analyse les logs d'entraînement et identifie les records personnels, tendances et recommandations.
Réponds en ${language === "ar" ? "arabe" : language === "en" ? "anglais" : "français"}.
RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;

      const userPrompt = `LOGS D'ENTRAÎNEMENT: ${JSON.stringify(logs.slice(0, 50))}
PROFIL: ${JSON.stringify(userProfile)}

Analyse et retourne:
{
  "personal_records": [{"exercise": "<nom>", "weight_kg": <num>, "reps": <int>, "date": "<date>"}],
  "progress_summary": "<résumé de la progression>",
  "weak_points": ["<point faible 1>"],
  "recommendations": ["<recommandation 1>"],
  "total_volume_kg": <int>
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[vital-ai] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
