import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SPLIT_CONFIGS: Record<string, any> = {
  upper_lower: {
    name: 'Upper/Lower Split',
    description: 'Upper body & lower body alternation, 4x/week',
    days: ['Upper A', 'Lower A', 'Rest', 'Upper B', 'Lower B', 'Rest', 'Rest'],
  },
  ppl: {
    name: 'Push/Pull/Legs',
    description: 'Push, Pull, Legs 2x/week rotation',
    days: ['Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull', 'Legs'],
  },
  arnold: {
    name: 'Arnold Split',
    description: 'Chest+Back, Shoulders+Arms, Legs 2x/week',
    days: ['Chest+Back', 'Shoulders+Arms', 'Legs', 'Chest+Back', 'Shoulders+Arms', 'Legs', 'Rest'],
  },
  anterior_posterior: {
    name: 'Anterior/Posterior Split',
    description: 'Anterior chain (push/quads) + Posterior chain (pull/hamstrings)',
    days: ['Anterior', 'Posterior', 'Rest', 'Anterior', 'Posterior', 'Rest', 'Rest'],
  },
  full_body: {
    name: 'Full Body',
    description: 'Full body training 3x/week',
    days: ['Full Body A', 'Rest', 'Full Body B', 'Rest', 'Full Body C', 'Rest', 'Rest'],
  },
  bro_split: {
    name: 'Bro Split',
    description: 'One muscle group per day',
    days: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Rest', 'Rest'],
  },
};

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
    const { type, biomarkers, profile, language = 'fr', country = 'TN' } = body;

    let systemPrompt = '';
    let userPrompt = '';
    let useMultimodal = false;
    let messages: any[] = [];

    const langInstructions: Record<string, string> = {
      fr: 'Réponds UNIQUEMENT en français. Sois précis, scientifique et actionnable.',
      ar: 'أجب باللغة العربية فقط. كن دقيقاً وعلمياً وقابلاً للتطبيق.',
      en: 'Respond ONLY in English. Be precise, scientific and actionable.',
    };

    if (type === 'biomarker_analysis') {
      systemPrompt = `Tu es VitalCore AI, expert en médecine factuelle (EBM), nutrition et performance sportive.
${langInstructions[language] || langInstructions.fr}
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans blocs de code.`;

      const markersList = biomarkers.map((b: any) => {
        const status = b.value < b.normal_min ? 'DÉFICIENT' : b.value > b.normal_max ? 'ÉLEVÉ' : 'OPTIMAL';
        return `- ${b.name}: ${b.value} ${b.unit} (Normal: ${b.normal_min}-${b.normal_max}) → ${status}`;
      }).join('\n');

      userPrompt = `Profil: ${profile.age} ans, ${profile.gender}, ${profile.weight}kg, ${profile.height}cm
Activité: ${profile.activity_level || 'moderate'}, Objectifs: ${profile.goals?.join(', ')}

Biomarqueurs:
${markersList}

JSON requis:
{
  "health_score": <0-100>,
  "vitality_score": <0-100>,
  "summary": "<résumé 1-2 phrases>",
  "alerts": [{"marker":"<nom>","status":"<low|high|critical>","recommendation":"<conseil>"}],
  "nutrition_adjustments": ["<conseil1>","<conseil2>","<conseil3>"],
  "training_adjustments": ["<conseil1>","<conseil2>"],
  "supplements": [{"name":"<nom>","dose":"<dose>","timing":"<moment>","evidence":"<référence>"}],
  "local_foods": ["<aliment local enrichi en nutriments manquants>"],
  "lifestyle_tips": ["<tip1>","<tip2>"]
}`;

    } else if (type === 'pdf_analysis') {
      systemPrompt = `Tu es VitalCore AI, expert en interprétation de bilans de laboratoire médicaux.
${langInstructions[language] || langInstructions.fr}
Analyse ce document PDF de résultats d'analyses biologiques et extrait tous les biomarqueurs avec leurs valeurs, unités et normes.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide.`;

      const pdfBase64 = body.pdfBase64;
      useMultimodal = true;

      messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse ce bilan de laboratoire et extrait TOUS les biomarqueurs trouvés. Pour chaque marqueur, fournis:

JSON requis:
{
  "markers": [
    {
      "name": "<nom du marqueur en français>",
      "nameAr": "<nom en arabe>",
      "value": <valeur numérique>,
      "unit": "<unité>",
      "normalMin": <valeur min normale>,
      "normalMax": <valeur max normale>,
      "category": "<hormones|vitamins|metabolic>",
      "status": "<optimal|low|high|critical>"
    }
  ],
  "lab_date": "<date si trouvée, sinon aujourd'hui>",
  "summary": "<résumé court des résultats>"
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ];

    } else if (type === 'meal_plan') {
      const countryFoods: Record<string, string[]> = {
        TN: ['Couscous', 'Lablabi', 'Ojja', 'Brik', 'Harissa', 'Merguez', 'Chorba', 'Makloub'],
        MA: ['Tagine', 'Pastilla', 'Harira', 'Mechoui', 'Rfissa', 'Bastilla'],
        DZ: ['Chakhchoukha', 'Rechta', 'Berkoukes', 'Bourak'],
        SA: ['Kabsa', 'Mandi', 'Jareesh', 'Saleeg', 'Harees'],
        AE: ['Machboos', 'Harees', 'Luqaimat', 'Thareed'],
        FR: ['Ratatouille', 'Quiche', 'Salade Niçoise', 'Cassoulet'],
        TR: ['Kebab', 'Meze', 'Dolma', 'Pide', 'Kofte'],
        GR: ['Souvlaki', 'Moussaka', 'Spanakopita', 'Horiatiki'],
        US: ['Grilled Chicken Bowl', 'Salmon', 'Greek Yogurt Parfait'],
        GB: ['Grilled Salmon', 'Chicken Tikka', 'Avocado Toast'],
      };
      const localFoods = countryFoods[country] || countryFoods.TN;
      const deficiencies = (biomarkers || []).filter((b: any) => b.value < b.normal_min).map((b: any) => b.name).join(', ');

      systemPrompt = `Tu es un nutritionniste expert en médecine du sport et cuisines du monde.
${langInstructions[language] || langInstructions.fr}
Pays de l'utilisateur: ${country}. Utilise des plats locaux: ${localFoods.join(', ')}.
Adapte les recettes aux carences biologiques.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown.`;

      userPrompt = `Profil: ${profile.age} ans, ${profile.weight}kg, Objectifs: ${profile.goals?.join(', ')}
TDEE: ${profile.tdee || 2200} kcal
Carences: ${deficiencies || 'aucune'}

JSON pour UN JOUR:
{
  "totalCalories": <n>,
  "macros": {"protein":<g>,"carbs":<g>,"fat":<g>,"fiber":<g>},
  "breakfast": {
    "name":"<nom>","nameAr":"<nom arabe>","calories":<n>,"protein":<n>,"carbs":<n>,"fat":<n>,"fiber":<n>,
    "prepTime":<min>,"image":"meal-2",
    "ingredients":["<ingrédient avec quantité>"],"ingredientsAr":["<مكون>"],
    "instructions":["<étape>"],"instructionsAr":["<خطوة>"],
    "tags":["<tag>"]
  },
  "lunch": {<même structure, image:"meal-1">},
  "dinner": {<même structure, image:"meal-3">},
  "snack": {<même structure, image:"meal-2">}
}`;

    } else if (type === 'country_recipes') {
      const { countryCode, category } = body;
      systemPrompt = `Tu es un chef cuisinier expert en gastronomie mondiale et nutrition sportive.
${langInstructions[language] || langInstructions.fr}
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide.`;

      userPrompt = `Génère 6 recettes AUTHENTIQUES de cuisine ${countryCode} pour la catégorie "${category}" (${language}).
Ces recettes doivent être adaptées à un profil fitness: ${profile.age} ans, ${profile.weight}kg, objectifs: ${profile.goals?.join(', ')}.

JSON requis (tableau de recettes):
[
  {
    "name": "<nom authentique>",
    "nameAr": "<nom en arabe>",
    "country": "${countryCode}",
    "category": "${category}",
    "calories": <n>,
    "protein": <g>,
    "carbs": <g>,
    "fat": <g>,
    "fiber": <g>,
    "prepTime": <min>,
    "difficulty": "<easy|medium|hard>",
    "image": "meal-1",
    "ingredients": ["<ingrédient avec quantité précise>"],
    "ingredientsAr": ["<مكون>"],
    "instructions": ["<étape détaillée>"],
    "instructionsAr": ["<خطوة>"],
    "tags": ["<tag>"],
    "healthBenefits": ["<bénéfice santé>"],
    "nutritionNote": "<note scientifique sur ce plat>"
  }
]`;

    } else if (type === 'training_plan') {
      const splitType = body.split_type || 'upper_lower';
      const workoutType = body.workout_type || 'hypertrophy';
      const splitConfig = SPLIT_CONFIGS[splitType] || SPLIT_CONFIGS.upper_lower;

      const splitDescriptions: Record<string, string> = {
        upper_lower: 'Upper/Lower Split: sépare haut du corps et bas du corps. Haute fréquence par groupe musculaire.',
        ppl: 'Push/Pull/Legs: Pousse (pectoraux, épaules, triceps), Tire (dos, biceps), Jambes. 2x/semaine.',
        arnold: 'Arnold Split (utilisé par Arnold Schwarzenegger): Pectoraux+Dos, Épaules+Bras, Jambes. 2x/semaine.',
        anterior_posterior: 'Chaîne antérieure (quadriceps, pectoraux, épaules) vs chaîne postérieure (ischio-jambiers, dos, fessiers).',
        full_body: 'Corps complet: stimulation de tous les groupes musculaires à chaque séance. 3x/semaine.',
        bro_split: 'Bro Split: un groupe musculaire par jour. Volume élevé par muscle.',
      };

      systemPrompt = `Tu es un coach sportif expert en science de l'entraînement, certifié NSCA et CSCS.
${langInstructions[language] || langInstructions.fr}
Programme: ${splitDescriptions[splitType] || splitDescriptions.upper_lower}
Bases scientifiques: RIR (Reps in Reserve), RPE, temps sous tension, périodisation ondulatoire.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown.`;

      userPrompt = `Profil: ${profile.age} ans, ${profile.weight}kg, Activité: ${profile.activity_level}
Objectifs: ${profile.goals?.join(', ')}
Type de séance: ${workoutType}
Programme: ${splitConfig.name}
Jour ciblé: ${splitConfig.days[0]}

Génère une séance DÉTAILLÉE avec 6-8 exercices avec ce JSON:
{
  "type": "${workoutType}",
  "split": "${splitType}",
  "name": "<nom précis de la séance>",
  "duration": <minutes>,
  "warmup": "<protocole échauffement 5-10 min>",
  "cooldown": "<protocole récupération 5 min>",
  "scienceTip": "<conseil scientifique basé sur littérature (Schoenfeld, Kramer, etc.)>",
  "scienceTipAr": "<même conseil en arabe>",
  "exercises": [
    {
      "id": "<id unique>",
      "name": "<nom exercice précis>",
      "nameAr": "<nom en arabe>",
      "muscleGroup": "<groupe musculaire principal>",
      "muscleGroupSecondary": "<muscles secondaires>",
      "sets": <nombre>,
      "reps": "<8-12 ou 30s ou format précis>",
      "rest": <secondes>,
      "rir": <0-4>,
      "tempo": "<3-1-2-0 format: excentrique-pause bas-concentrique-pause haut>",
      "intensity": "<high|medium|low>",
      "technique": "<conseil technique précis avec cue visuel>",
      "progression": "<surcharge progressive: +2.5kg/semaine, etc.>"
    }
  ]
}`;
    }

    // Build messages array if not multimodal
    if (!useMultimodal) {
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
    }

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
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
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', rawContent.substring(0, 500));
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON', raw: rawContent.substring(0, 200) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cache in DB (skip for pdf and recipes)
    if (type !== 'country_recipes') {
      await supabase.from('ai_analyses').insert({
        user_id: user.id,
        type,
        input_data: { biomarkers: biomarkers?.slice(0, 3), profile: { age: profile?.age }, language },
        result: parsed,
      }).catch(console.error);
    }

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
