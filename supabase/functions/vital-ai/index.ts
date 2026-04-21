import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { type, biomarkers, profile, language = 'fr' } = body;

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'biomarker_analysis') {
      const langInstructions: Record<string, string> = {
        fr: 'Réponds UNIQUEMENT en français. Sois précis, scientifique et actionnable.',
        ar: 'أجب باللغة العربية فقط. كن دقيقاً وعلمياً وقابلاً للتطبيق.',
        en: 'Respond ONLY in English. Be precise, scientific and actionable.',
      };

      systemPrompt = `Tu es VitalCore AI, un expert en médecine factuelle (Evidence-Based Medicine), nutrition et performance sportive.
${langInstructions[language] || langInstructions.fr}
Tu analyses des biomarqueurs biologiques et fournis des recommandations personnalisées basées sur les dernières recherches scientifiques mondiales.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans blocs de code.`;

      const markersList = biomarkers.map((b: any) => {
        const status = b.value < b.normal_min ? 'DÉFICIENT' : b.value > b.normal_max ? 'ÉLEVÉ' : 'OPTIMAL';
        return `- ${b.name}: ${b.value} ${b.unit} (Normal: ${b.normal_min}-${b.normal_max}) → ${status}`;
      }).join('\n');

      userPrompt = `Profil: ${profile.age} ans, ${profile.gender}, ${profile.weight}kg, ${profile.height}cm, Activité: ${profile.activity_level}
Objectifs: ${profile.goals?.join(', ')}

Biomarqueurs:
${markersList}

Retourne un JSON avec cette structure exacte:
{
  "health_score": <0-100>,
  "vitality_score": <0-100>,
  "summary": "<résumé court 1-2 phrases>",
  "alerts": [{"marker": "<nom>", "status": "<low|high|critical>", "recommendation": "<conseil court>"}],
  "nutrition_adjustments": ["<conseil nutritionnel 1>", "<conseil nutritionnel 2>", "<conseil nutritionnel 3>"],
  "training_adjustments": ["<conseil entraînement 1>", "<conseil entraînement 2>"],
  "supplements": [{"name": "<nom>", "dose": "<dosage>", "timing": "<moment>", "evidence": "<référence scientifique courte>"}],
  "local_foods": ["<aliment local tunisien/méditerranéen riche en nutriments manquants>"],
  "lifestyle_tips": ["<conseil lifestyle 1>", "<conseil lifestyle 2>"]
}`;
    }

    else if (type === 'meal_plan') {
      const langInstructions: Record<string, string> = {
        fr: 'Réponds en français. Inclus des plats méditerranéens et tunisiens.',
        ar: 'أجب باللغة العربية. أدرج أطباقاً تونسية ومتوسطية.',
        en: 'Respond in English. Include Mediterranean and Tunisian dishes.',
      };

      systemPrompt = `Tu es un nutritionniste expert en médecine du sport et cuisine méditerranéenne/tunisienne.
${langInstructions[language] || langInstructions.fr}
Crée des plans de repas équilibrés basés sur les biomarqueurs de l'utilisateur.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown.`;

      const deficiencies = (biomarkers || []).filter((b: any) => b.value < b.normal_min).map((b: any) => b.name).join(', ');
      const tdee = profile.tdee || 2200;

      userPrompt = `Profil: ${profile.age} ans, ${profile.weight}kg, Objectifs: ${profile.goals?.join(', ')}
TDEE estimé: ${tdee} kcal
Carences détectées: ${deficiencies || 'aucune'}

Génère un plan pour UN SEUL JOUR avec ce JSON exact:
{
  "totalCalories": <nombre>,
  "macros": {"protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>},
  "breakfast": {
    "name": "<nom>", "nameAr": "<nom arabe>", "calories": <n>, "protein": <n>, "carbs": <n>, "fat": <n>, "fiber": <n>,
    "prepTime": <minutes>, "image": "meal-1",
    "ingredients": ["<ingrédient 1 avec quantité>", "<ingrédient 2>", "<ingrédient 3>", "<ingrédient 4>"],
    "ingredientsAr": ["<مكون 1>", "<مكون 2>", "<مكون 3>", "<مكون 4>"],
    "instructions": ["<étape 1>", "<étape 2>", "<étape 3>"],
    "instructionsAr": ["<خطوة 1>", "<خطوة 2>", "<خطوة 3>"],
    "tags": ["<tag1>", "<tag2>"]
  },
  "lunch": { <même structure, image: "meal-2"> },
  "dinner": { <même structure, image: "meal-3"> },
  "snack": { <même structure, image: "meal-1"> }
}`;
    }

    else if (type === 'training_plan') {
      systemPrompt = `Tu es un coach sportif expert en science du sport (hypertrophie, force, longévité).
Crée des plans d'entraînement basés sur les données biologiques.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown.`;

      userPrompt = `Profil: ${profile.age} ans, ${profile.weight}kg, Activité: ${profile.activity_level}
Objectifs: ${profile.goals?.join(', ')}
Type demandé: ${body.workout_type || 'hypertrophy'}
Langue: ${language}

Génère un plan de séance avec ce JSON:
{
  "type": "<hypertrophy|strength|endurance|longevity|recovery>",
  "name": "<nom séance>",
  "duration": <minutes>,
  "scienceTip": "<conseil scientifique en ${language}>",
  "scienceTipAr": "<conseil en arabe>",
  "exercises": [
    {
      "id": "<id unique>",
      "name": "<nom exercice>",
      "nameAr": "<nom en arabe>",
      "muscleGroup": "<groupe musculaire>",
      "sets": <nombre>,
      "reps": "<reps ou durée>",
      "rest": <secondes de repos>,
      "intensity": "<high|medium|low>",
      "technique": "<conseil technique court>"
    }
  ]
}
Génère 5-7 exercices adaptés.`;
    }

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', errText);
      return new Response(JSON.stringify({ error: `AI: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';

    let parsed: any = {};
    try {
      // Clean potential markdown fences
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', rawContent);
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON', raw: rawContent }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cache result in DB
    const { error: saveError } = await supabase.from('ai_analyses').insert({
      user_id: user.id,
      type,
      input_data: { biomarkers, profile, language },
      result: parsed,
    });
    if (saveError) console.error('Save error:', saveError);

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
