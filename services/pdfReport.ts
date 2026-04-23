// VitalCore AI — Health PDF Report Export Service
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface HealthReportData {
  userName: string;
  date: string;
  healthScore: number;
  profile: {
    age: number;
    weight: number;
    height: number;
    gender: string;
    activityLevel: string;
    goals: string[];
  };
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    normalMin: number;
    normalMax: number;
    category: string;
  }>;
  deficiencies: string[];
  dailyStats: {
    calories: number;
    water: number;
    steps: number;
    sleep: number;
  };
  aiSummary?: string;
  supplements?: Array<{ name: string; dose: string }>;
}

function getStatusBadge(value: number, min: number, max: number): string {
  if (value < min * 0.7 || value > max * 1.3) return '<span class="badge critical">Critique</span>';
  if (value < min) return '<span class="badge low">Bas</span>';
  if (value > max) return '<span class="badge high">Élevé</span>';
  return '<span class="badge optimal">Optimal</span>';
}

function getBMILabel(bmi: number): string {
  if (bmi < 18.5) return 'Insuffisance pondérale';
  if (bmi < 25) return 'Poids normal';
  if (bmi < 30) return 'Surpoids';
  return 'Obésité';
}

export async function generateHealthReportPDF(data: HealthReportData): Promise<{ success: boolean; error?: string }> {
  try {
    const bmi = (data.profile.weight / Math.pow(data.profile.height / 100, 2)).toFixed(1);
    const bmr = data.profile.gender === 'male'
      ? 88.362 + 13.397 * data.profile.weight + 4.799 * data.profile.height - 5.677 * data.profile.age
      : 447.593 + 9.247 * data.profile.weight + 3.098 * data.profile.height - 4.330 * data.profile.age;
    const tdee = Math.round(bmr * 1.55);

    const scoreColor = data.healthScore >= 75 ? '#10B981' : data.healthScore >= 50 ? '#F59E0B' : '#EF4444';

    const hormonesTable = data.biomarkers
      .filter(b => b.category === 'hormones')
      .map(b => `
        <tr>
          <td>${b.name}</td>
          <td><strong>${b.value} ${b.unit}</strong></td>
          <td>${b.normalMin} – ${b.normalMax} ${b.unit}</td>
          <td>${getStatusBadge(b.value, b.normalMin, b.normalMax)}</td>
        </tr>
      `).join('');

    const vitaminsTable = data.biomarkers
      .filter(b => b.category === 'vitamins')
      .map(b => `
        <tr>
          <td>${b.name}</td>
          <td><strong>${b.value} ${b.unit}</strong></td>
          <td>${b.normalMin} – ${b.normalMax} ${b.unit}</td>
          <td>${getStatusBadge(b.value, b.normalMin, b.normalMax)}</td>
        </tr>
      `).join('');

    const metabolicTable = data.biomarkers
      .filter(b => b.category === 'metabolic')
      .map(b => `
        <tr>
          <td>${b.name}</td>
          <td><strong>${b.value} ${b.unit}</strong></td>
          <td>${b.normalMin} – ${b.normalMax} ${b.unit}</td>
          <td>${getStatusBadge(b.value, b.normalMin, b.normalMax)}</td>
        </tr>
      `).join('');

    const supplementsHTML = data.supplements && data.supplements.length > 0
      ? `<div class="section">
          <h2>💊 Suppléments Recommandés</h2>
          <div class="supps-grid">
            ${data.supplements.map(s => `
              <div class="supp-card">
                <div class="supp-name">${s.name}</div>
                <div class="supp-dose">${s.dose}</div>
              </div>
            `).join('')}
          </div>
        </div>`
      : '';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport Santé VitalCore AI</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; }
  
  .header { background: linear-gradient(135deg, #0B1426 0%, #1a2040 100%); color: white; padding: 40px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 28px; font-weight: 900; color: #00D4FF; letter-spacing: 1px; }
  .brand-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }
  .report-meta { text-align: right; }
  .report-date { font-size: 13px; color: rgba(255,255,255,0.6); }
  .report-name { font-size: 18px; font-weight: 700; color: #FFB800; margin-top: 4px; }
  
  .score-row { display: flex; align-items: center; gap: 24px; margin-top: 32px; }
  .score-circle { width: 100px; height: 100px; border-radius: 50%; border: 6px solid ${scoreColor}; 
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.08); }
  .score-num { font-size: 36px; font-weight: 900; color: ${scoreColor}; }
  .score-label { font-size: 10px; color: rgba(255,255,255,0.6); }
  .score-desc { flex: 1; }
  .score-title { font-size: 20px; font-weight: 700; color: white; margin-bottom: 8px; }
  .score-sub { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6; }
  
  .content { padding: 32px 40px; }
  .section { margin-bottom: 32px; }
  h2 { font-size: 18px; font-weight: 700; color: #0B1426; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
  
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-card { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
  .stat-val { font-size: 22px; font-weight: 800; color: #0B1426; }
  .stat-unit { font-size: 11px; color: #64748b; }
  .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
  
  .bio-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
  .bio-card { background: #f0f9ff; border-radius: 10px; padding: 14px; border: 1px solid #bae6fd; }
  .bio-label { font-size: 11px; color: #0369a1; font-weight: 600; }
  .bio-val { font-size: 18px; font-weight: 800; color: #0B1426; margin-top: 2px; }
  .bio-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  
  .badge { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge.optimal { background: #dcfce7; color: #16a34a; }
  .badge.low { background: #fef3c7; color: #d97706; }
  .badge.high { background: #fef3c7; color: #d97706; }
  .badge.critical { background: #fee2e2; color: #dc2626; }
  
  .deficiency-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .deficiency-chip { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px 14px; font-size: 12px; color: #c2410c; font-weight: 600; }
  
  .supps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .supp-card { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 12px; text-align: center; }
  .supp-name { font-size: 13px; font-weight: 700; color: #92400e; }
  .supp-dose { font-size: 11px; color: #78716c; margin-top: 4px; }
  
  .ai-summary { background: linear-gradient(135deg, #eff6ff, #f0f9ff); border-left: 4px solid #00D4FF; padding: 20px; border-radius: 0 12px 12px 0; }
  .ai-summary-text { font-size: 14px; color: #1e40af; line-height: 1.7; }
  
  .footer { background: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; margin-top: 16px; }
  .footer-text { font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6; }
  .footer-brand { font-weight: 700; color: #00D4FF; }
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div>
      <div class="brand">VitalCore AI</div>
      <div class="brand-sub">Rapport de Santé Personnalisé · Médecine Factuelle</div>
    </div>
    <div class="report-meta">
      <div class="report-date">Généré le ${data.date}</div>
      <div class="report-name">${data.userName}</div>
    </div>
  </div>
  
  <div class="score-row">
    <div class="score-circle">
      <div class="score-num">${data.healthScore}</div>
      <div class="score-label">/100</div>
    </div>
    <div class="score-desc">
      <div class="score-title">Score de Santé Global</div>
      <div class="score-sub">
        ${data.deficiencies.length > 0
          ? `⚠️ ${data.deficiencies.length} carence(s) détectée(s): ${data.deficiencies.slice(0, 3).join(', ')}`
          : '✅ Tous les marqueurs dans les normes optimales'}
      </div>
    </div>
  </div>
</div>

<div class="content">

  <!-- Daily Stats -->
  <div class="section">
    <h2>📊 Statistiques du Jour</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val">${data.dailyStats.calories}</div>
        <div class="stat-unit">kcal</div>
        <div class="stat-label">Calories</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${data.dailyStats.water}</div>
        <div class="stat-unit">ml</div>
        <div class="stat-label">Hydratation</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${data.dailyStats.steps.toLocaleString()}</div>
        <div class="stat-unit">pas</div>
        <div class="stat-label">Activité</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${data.dailyStats.sleep}h</div>
        <div class="stat-unit">sommeil</div>
        <div class="stat-label">Récupération</div>
      </div>
    </div>
  </div>

  <!-- Biometric Profile -->
  <div class="section">
    <h2>👤 Profil Biométrique</h2>
    <div class="bio-grid">
      <div class="bio-card">
        <div class="bio-label">POIDS</div>
        <div class="bio-val">${data.profile.weight} kg</div>
      </div>
      <div class="bio-card">
        <div class="bio-label">TAILLE</div>
        <div class="bio-val">${data.profile.height} cm</div>
      </div>
      <div class="bio-card">
        <div class="bio-label">IMC</div>
        <div class="bio-val">${bmi}</div>
        <div class="bio-sub">${getBMILabel(parseFloat(bmi))}</div>
      </div>
      <div class="bio-card">
        <div class="bio-label">TDEE</div>
        <div class="bio-val">${tdee} kcal</div>
        <div class="bio-sub">Dépense énergétique totale</div>
      </div>
    </div>
  </div>

  <!-- Hormones -->
  ${hormonesTable ? `
  <div class="section">
    <h2>⚗️ Panel Hormonal</h2>
    <table>
      <thead><tr><th>Marqueur</th><th>Valeur</th><th>Norme</th><th>Statut</th></tr></thead>
      <tbody>${hormonesTable}</tbody>
    </table>
  </div>` : ''}

  <!-- Vitamins -->
  ${vitaminsTable ? `
  <div class="section">
    <h2>💊 Vitamines & Minéraux</h2>
    <table>
      <thead><tr><th>Marqueur</th><th>Valeur</th><th>Norme</th><th>Statut</th></tr></thead>
      <tbody>${vitaminsTable}</tbody>
    </table>
  </div>` : ''}

  <!-- Metabolic -->
  ${metabolicTable ? `
  <div class="section">
    <h2>🔬 Bilan Métabolique</h2>
    <table>
      <thead><tr><th>Marqueur</th><th>Valeur</th><th>Norme</th><th>Statut</th></tr></thead>
      <tbody>${metabolicTable}</tbody>
    </table>
  </div>` : ''}

  <!-- Deficiencies -->
  ${data.deficiencies.length > 0 ? `
  <div class="section">
    <h2>⚠️ Carences Identifiées</h2>
    <div class="deficiency-list">
      ${data.deficiencies.map(d => `<div class="deficiency-chip">⚠️ ${d}</div>`).join('')}
    </div>
  </div>` : ''}

  <!-- Supplements -->
  ${supplementsHTML}

  <!-- AI Summary -->
  ${data.aiSummary ? `
  <div class="section">
    <h2>🤖 Analyse IA Personnalisée</h2>
    <div class="ai-summary">
      <div class="ai-summary-text">${data.aiSummary}</div>
    </div>
  </div>` : ''}

</div>

<div class="footer">
  <div class="footer-text">
    Ce rapport est généré par <span class="footer-brand">VitalCore AI</span> à des fins d'information personnelle.<br>
    Il ne remplace pas un avis médical professionnel. Consultez un médecin pour tout diagnostic ou traitement.<br>
    Basé sur la médecine factuelle (EBM) · Sources: JAMA, NEJM, Lancet, NSCA, CSCS
  </div>
</div>

</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exporter le Rapport de Santé',
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true };
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return { success: false, error: err.message };
  }
}
