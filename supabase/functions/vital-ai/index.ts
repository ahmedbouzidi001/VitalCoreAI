import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function callOnspaceAI(systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
  const baseUrl = Deno.env.get("ONSPACE_AI_BASE_URL") || "https://ai.onspace.ai/v1";
  const onspaceKey = Deno.env.get("ONSPACE_AI_API_KEY") || "";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${onspaceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.7, max_tokens: 6000,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OnSpace AI error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (apiKey && apiKey.trim() !== "") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const generationConfig: any = { temperature: 0.7, maxOutputTokens: 6000 };
    if (jsonMode) generationConfig.responseMimeType = "application/json";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig,
      }),
    });
    if (res.status === 429 || res.status === 503) {
      console.warn(`[vital-ai] Gemini quota/rate-limit (${res.status}), falling back to OnSpace AI`);
      return callOnspaceAI(systemPrompt, userPrompt, jsonMode);
    }
    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes("RESOURCE_EXHAUSTED") || errText.includes("quota")) {
        console.warn("[vital-ai] Gemini quota exhausted, falling back to OnSpace AI");
        return callOnspaceAI(systemPrompt, userPrompt, jsonMode);
      }
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  return callOnspaceAI(systemPrompt, userPrompt, jsonMode);
}

function cleanJSON(raw: string): any {
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

function cleanJSONArray(raw: string): any[] {
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
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
    const lang = language === "ar" ? "arabe" : language === "en" ? "anglais" : "français";
    console.log(`[vital-ai] Request type: ${type}, language: ${language}`);

    // ==================== BIOMARKER ANALYSIS ====================
    if (type === "biomarker_analysis") {
      const { biomarkers, profile } = body;
      const systemPrompt = `Tu es un médecin expert en médecine fonctionnelle, endocrinologie et nutrition clinique basée sur les preuves (EBM).
Analyse les biomarqueurs fournis selon les normes les plus récentes (JAMA, NEJM, Lancet, PubMed).
Réponds UNIQUEMENT en ${lang}.
RETOURNE UNIQUEMENT UN OBJET JSON VALIDE, sans markdown ni texte autour.`;

      const userPrompt = `PROFIL PATIENT: ${JSON.stringify(profile)}
BIOMARQUEURS: ${JSON.stringify(biomarkers)}

Analyse complète basée sur les preuves scientifiques. Format JSON exact:
{
  "health_score": <integer 0-100>,
  "vitality_score": <integer 0-100>,
  "summary": "<résumé clinique précis en 3-4 phrases, mentionner les valeurs spécifiques>",
  "alerts": [
    {"marker": "<nom>", "status": "<critical|low|high|optimal>", "recommendation": "<action précise et chiffrée>", "source": "<étude scientifique>"}
  ],
  "nutrition_adjustments": ["<conseil nutrition spécifique avec quantités>", "<conseil 2>", "<conseil 3>"],
  "training_adjustments": ["<ajustement entraînement basé sur biomarqueurs>", "<conseil 2>"],
  "supplements": [
    {"name": "<supplément>", "dose": "<dosage précis mg/UI>", "timing": "<moment optimal>", "evidence": "<source PubMed/étude>"}
  ],
  "local_foods": ["<aliment local riche en nutriment déficient>", "<aliment 2>", "<aliment 3>"],
  "lifestyle_tips": ["<conseil lifestyle basé sur données>", "<conseil 2>"]
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          await supabase.from("ai_analyses").upsert({
            user_id: user.id, type: "biomarker_analysis",
            input_data: { biomarkers, profile }, result,
          }, { onConflict: "user_id,type" }).catch(console.error);
          await supabase.from("health_score_history").upsert({
            user_id: user.id,
            score: result.health_score || result.vitality_score || 70,
            date: new Date().toISOString().split("T")[0],
          }, { onConflict: "user_id,date" }).catch(console.error);
        }
      }
      return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== PDF ANALYSIS ====================
    if (type === "pdf_analysis") {
      const { pdfBase64 } = body;
      const systemPrompt = `Tu es un médecin biologiste expert en interprétation de bilans sanguins tunisiens et internationaux.
Réponds en ${lang}. RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;
      const userPrompt = `Analyse ce bilan biologique (base64): ${pdfBase64.substring(0, 3000)}...
Extrait toutes les valeurs disponibles:
{
  "lab_name": "<nom du laboratoire ou null>",
  "lab_date": "<date YYYY-MM-DD ou null>",
  "patient_name": "<nom du patient ou null>",
  "summary": "<résumé clinique 2-3 phrases>",
  "markers": [
    {
      "name": "<nom en français>", "nameAr": "<nom en arabe>",
      "value": <valeur numérique>, "unit": "<unité>",
      "normalMin": <min normal>, "normalMax": <max normal>,
      "status": "<optimal|low|high|critical>",
      "category": "<hormones|vitamins|metabolic>"
    }
  ]
}`;
      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);
      return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== MEAL PLAN ====================
    if (type === "meal_plan") {
      const { biomarkers, profile, country = "TN" } = body;
      const countryFoods: Record<string, string> = {
        TN: "Couscous, Lablabi, Brik, Merguez, Harissa, Chorba, Maklouba, Dattes Deglet Nour, Ojja, Fricassee, Kafteji, Huile d'olive tunisienne, Poulpe, Sardines",
        MA: "Tagine, Couscous marocain, Harira, Pastilla, Chermoula, Argan oil, Smen, Bastilla",
        DZ: "Chakhchoukha, Berkoukes, Rechta, Garantita, Hammar el laham",
        FR: "Boeuf bourguignon, Quiche, Ratatouille, Salade niçoise, Fromages AOP, Poulet rôti",
        SA: "Kabsa, Jareesh, Mutabbaq, Madfoon, Dates Medjool, Saleeg",
        AE: "Harees, Madrooba, Al Harees, Dates, Camel milk, Machboos",
        TR: "Kebab, Mercimek çorbası, Dolma, Lahmacun, Ayran, Börek, Menemen",
        LB: "Mezze, Tabbouleh, Kibbeh, Fattoush, Hummus bil lahme, Kafta",
        EG: "Koshari, Ful medames, Molokhia, Feteer, Om Ali, Hamam Mahshi",
        GR: "Moussaka, Souvlaki, Hummus, Tzatziki, Spanakopita, Olive oil",
      };
      const localFoods = countryFoods[country] || countryFoods.TN;
      const deficiencies = (biomarkers || []).filter((b: any) => b.value < b.normal_min);
      const prefsContext = profile.preferencesContext || "";
      const systemPrompt = `Tu es un nutritionniste expert en nutrition sportive et médecine fonctionnelle.
Crée un plan de repas pour UNE JOURNÉE complet, adapté EXACTEMENT aux biomarqueurs, carences et PRÉFÉRENCES de l'utilisateur.
${prefsContext ? `PRÉFÉRENCES UTILISATEUR: ${prefsContext}` : ""}
Inclus des aliments locaux de ${country}: ${localFoods}
Réponds en ${lang}. RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;

      const userPrompt = `PROFIL: ${JSON.stringify(profile)}
CARENCES: ${JSON.stringify(deficiencies.map((d: any) => d.name))}
TDEE: ${profile.tdee || 2200} kcal

Format JSON exact:
{
  "totalCalories": <integer>,
  "macros": {"protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>},
  "breakfast": {
    "name": "<nom en français>", "nameAr": "<اسم بالعربي>",
    "calories": <int>, "protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>,
    "prepTime": <minutes>, "image": "meal-1",
    "ingredients": ["<ingrédient précis avec quantité>"],
    "ingredientsAr": ["<مكون بالكمية>"],
    "instructions": ["<étape 1>", "<étape 2>", "<étape 3>"],
    "instructionsAr": ["<خطوة 1>"],
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
      return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== COUNTRY RECIPES ====================
    if (type === "country_recipes") {
      const { countryCode, category, profile: userProfile } = body;
      const systemPrompt = `Tu es un chef cuisinier et nutritionniste expert en cuisine mondiale.
Génère des recettes authentiques, détaillées et nutritionnellement équilibrées.
Réponds en ${lang}. RETOURNE UNIQUEMENT UN TABLEAU JSON VALIDE.`;
      const userPrompt = `Génère 4-5 recettes authentiques de ${countryCode} dans la catégorie "${category}".
Profil: ${JSON.stringify(userProfile)}
Format JSON (tableau):
[{
  "id": "<id unique>", "name": "<nom>", "nameAr": "<اسم بالعربي>",
  "country": "${countryCode}", "category": "${category}",
  "calories": <int>, "protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>,
  "prepTime": <minutes>, "difficulty": "<easy|medium|hard>", "servings": <int>,
  "image": "meal-1",
  "ingredients": ["<ingrédient précis avec quantité>"],
  "ingredientsAr": ["<مكون>"],
  "instructions": ["<étape détaillée>"],
  "instructionsAr": ["<خطوة>"],
  "healthBenefits": ["<bénéfice santé basé sur les preuves>"],
  "tags": ["<tag>"]
}]`;
      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSONArray(raw);
      const withImages = result.map((r: any, i: number) => ({ ...r, image: `meal-${(i % 3) + 1}` }));
      return new Response(JSON.stringify({ data: withImages }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== TRAINING PLAN (ENHANCED WITH SCIENCE) ====================
    if (type === "training_plan") {
      const { profile: userProfile, workout_type = "hypertrophy", split_type = "upper_lower" } = body;

      const scienceBase: Record<string, string> = {
        hypertrophy: `PROTOCOLE HYPERTROPHIE (Schoenfeld 2010, 2017; Krieger 2010):
- Volume: 10-20 séries/muscle/semaine
- Intensité: 65-85% 1RM, 6-15 reps
- Repos: 60-120s (Schoenfeld 2016)
- Progression: double progression (reps puis charge)
- Tempo: 2-1-2 (excentrique-isométrique-concentrique)
- Fréquence: 2x/semaine par groupe musculaire (Ralston 2017)
- RIR: 1-3 (Zourdos 2016)`,
        strength: `PROTOCOLE FORCE (Kraemer & Ratamess 2004; NSCA 2021):
- Volume: 2-6 reps, 85-95% 1RM
- Repos: 3-5 min (récupération ATP-PCr complète)
- Périodisation: linéaire ou ondulante (Prestes 2009)
- Vitesse: concentrique maximale
- Progression: +2.5kg quand toutes les séries complètes
- Spécificité: mouvements fondamentaux (squat, DL, développé)`,
        endurance: `PROTOCOLE ENDURANCE MUSCULAIRE (ACSM 2019):
- Volume: 15-25 reps, 40-60% 1RM
- Repos: 30-60s
- Circuits training pour adaptation métabolique
- High reps avec contrôle du tempo
- Densité d'entraînement élevée`,
        longevity: `PROTOCOLE LONGÉVITÉ (Fiatarone-Singh 2014; Liu-Ambrose 2012):
- Focus: mobilité, stabilité, force fonctionnelle
- Intensité modérée: 50-70% 1RM
- Mouvements fonctionnels: fentes, poussées, tractions
- Exercices de stabilité du tronc
- Entraînement en équilibre
- Récupération optimale prioritaire`,
        recovery: `PROTOCOLE RÉCUPÉRATION ACTIVE (Monedero & Donne 2000):
- Intensité légère: 30-40% effort maximal
- Objectif: élimination du lactate et DOMS
- Mobilité, yoga, natation légère
- Techniques myofasciales (foam rolling)`,
      };

      const splitDescriptions: Record<string, string> = {
        upper_lower: `UPPER/LOWER SPLIT (Colquhoun 2018):
Jour 1: Haut du corps Push (pectoraux, épaules, triceps)
Jour 2: Bas du corps Quad-dominant (quadriceps, fessiers)
Jour 3: Repos actif
Jour 4: Haut du corps Pull (dos, biceps, trapèzes)
Jour 5: Bas du corps Hip-dominant (ischio-jambiers, fessiers)
Fréquence: 2x/semaine par groupe — optimal pour hypertrophie`,
        ppl: `PUSH/PULL/LEGS (Colquhoun 2018; Ralston 2017):
Push: pectoraux, épaules antérieures, triceps
Pull: dos (latissimus, rhomboïdes), biceps, trapèzes postérieurs
Legs: quadriceps, ischio-jambiers, fessiers, mollets
Fréquence optimale: 6 jours/semaine`,
        arnold: `ARNOLD SPLIT (Arnold Schwarzenegger Blueprint):
Jour 1: Chest + Back (synergisme développé couché / rowing)
Jour 2: Shoulders + Arms (isolation + volume)
Jour 3: Legs (complet)
Répété 2x/semaine = fréquence 2x par muscle`,
        anterior_posterior: `ANTERIOR/POSTERIOR SPLIT (Contreras 2015):
Anterior: muscles antérieurs (quadriceps, pectoraux, épaules ant., biceps)
Posterior: muscles postérieurs (ischio, fessiers, dos, trapèzes, triceps)
Base sur les chaînes musculaires — optimal pour équilibre postural`,
        full_body: `FULL BODY (Colquhoun 2018; Ralston 2017):
3 séances/semaine, tout le corps à chaque séance
Fréquence 3x/semaine par muscle — maximale pour débutants/intermédiaires
Exercices polyarticulaires en priorité`,
        bro_split: `BRO SPLIT (Volume hebdomadaire élevé):
1 groupe musculaire par jour sur 5-6 jours
Volume total élevé par session (15-20 séries)
Optimal pour bodybuilders avancés cherchant volume maximal`,
      };

      const bmr = userProfile.gender === "male"
        ? 88.362 + 13.397 * (userProfile.weight || 75) + 4.799 * (userProfile.height || 175) - 5.677 * (userProfile.age || 25)
        : 447.593 + 9.247 * (userProfile.weight || 60) + 3.098 * (userProfile.height || 165) - 4.330 * (userProfile.age || 25);

      const systemPrompt = `Tu es un coach personnel NSCA-CSCS et scientifique du sport expert en science de l'entraînement basée sur les preuves.
Tu travailles avec les données scientifiques les plus récentes (JAMA, NSCA, ACSM, Journal of Strength and Conditioning Research).

PROGRAMME CHOISI: ${splitDescriptions[split_type] || split_type}
BASE SCIENTIFIQUE: ${scienceBase[workout_type] || scienceBase.hypertrophy}

Génère UNE séance COMPLÈTE et DÉTAILLÉE avec 5-8 exercices scientifiquement sélectionnés.
Réponds en ${lang}. RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;

      const userPrompt = `PROFIL ATHLÈTE:
- Âge: ${userProfile.age || 25} ans | Genre: ${userProfile.gender || "male"}
- Poids: ${userProfile.weight || 75} kg | Taille: ${userProfile.height || 175} cm
- Niveau: ${userProfile.activityLevel || "moderate"}
- Objectifs: ${(userProfile.goals || []).join(", ")}
- BMR calculé: ${Math.round(bmr)} kcal/jour
SPLIT: ${split_type} | TYPE: ${workout_type}

Génère une séance complète avec science. Format JSON:
{
  "type": "${workout_type}",
  "name": "<nom descriptif de la séance>",
  "duration": <minutes 45-90>,
  "warmup": "<échauffement spécifique 5-8 min — exercices précis>",
  "cooldown": "<retour au calme 5-10 min — stretching ciblé>",
  "scienceTip": "<conseil scientifique sourcé précis, mentionner auteur et année>",
  "scienceTipAr": "<نصيحة علمية مع مصدر>",
  "exercises": [
    {
      "id": "<unique_id>",
      "name": "<nom exercice en français>",
      "nameAr": "<اسم بالعربي>",
      "muscleGroup": "<muscle principal>",
      "muscleGroupSecondary": "<muscles secondaires>",
      "sets": <integer 2-5>,
      "reps": "<ex: 8-10 ou 3x12 ou 30s>",
      "rest": <secondes 45-300>,
      "intensity": "<high|medium|low>",
      "technique": "<cue technique précis en 1-2 phrases — anatomiquement correct>",
      "tempo": "<ex: 3-1-2-0 signifie 3s excentrique, 1s pause bas, 2s concentrique, 0s pause haut>",
      "rir": <repetitions in reserve 0-4>,
      "progression": "<règle de progression hebdomadaire précise>",
      "equipement": "<haltères|barre|machine|câble|poids du corps|bande>",
      "category": "<compound|isolation|cardio|mobility>"
    }
  ]
}`;

      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);
      return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== AI CHAT ====================
    if (type === "chat") {
      const { message, history = [], systemContext } = body;
      const systemPrompt = systemContext || `Tu es VitalCore AI, un assistant santé expert en médecine factuelle et nutrition.
Réponds de façon précise, chaleureuse et basée sur des preuves scientifiques en ${lang}.`;
      const historyText = history.slice(-6).map((h: any) =>
        `${h.role === "user" ? "Utilisateur" : "Assistant"}: ${h.content}`
      ).join("\n");
      const fullPrompt = historyText ? `${historyText}\n\nUtilisateur: ${message}\n\nAssistant:` : message;
      const raw = await callGemini(systemPrompt, fullPrompt, false);
      return new Response(JSON.stringify({ data: { content: raw.trim(), role: "assistant" } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== WORKOUT LOG ANALYSIS ====================
    if (type === "workout_log_analysis") {
      const { logs, profile: userProfile } = body;
      const systemPrompt = `Tu es un coach expert en analyse de performance et progression en musculation.
Analyse les logs et identifie records personnels, tendances et recommandations.
Réponds en ${lang}. RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.`;
      const userPrompt = `LOGS: ${JSON.stringify(logs.slice(0, 50))}
PROFIL: ${JSON.stringify(userProfile)}
Format:
{
  "personal_records": [{"exercise": "<nom>", "weight_kg": <num>, "reps": <int>, "date": "<date>"}],
  "progress_summary": "<résumé progression>",
  "weak_points": ["<point faible 1>"],
  "recommendations": ["<recommandation 1>"],
  "total_volume_kg": <int>
}`;
      const raw = await callGemini(systemPrompt, userPrompt, true);
      const result = cleanJSON(raw);
      return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[vital-ai] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
