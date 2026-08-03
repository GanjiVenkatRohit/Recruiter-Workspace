const db = require('../src/db');
const { parseResume } = require('../src/pipeline/resumeParser');

async function recalculateAllExperience() {
  console.log('Starting experience recalculation for all candidates...');

  try {
    const query = `
      SELECT c.id, c.name, c.experience AS old_exp, r.raw_text
      FROM candidates c
      INNER JOIN resume_content r ON c.id = r.candidate_id
      WHERE r.raw_text IS NOT NULL AND TRIM(r.raw_text) != ''
    `;
    const res = await db.query(query);

    console.log(`Found ${res.rows.length} candidates with stored resume text.`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const candidate of res.rows) {
      const parsed = parseResume(candidate.raw_text);
      if (parsed && parsed.experience && parsed.experience.value !== null) {
        const newExp = parsed.experience.value;
        await db.query('UPDATE candidates SET experience = $1, updated_at = NOW() WHERE id = $2', [newExp, candidate.id]);
        updatedCount++;
        console.log(`✓ Updated [${candidate.name}] ID ${candidate.id}: ${candidate.old_exp ?? 'null'} -> ${newExp} years`);
      } else {
        unchangedCount++;
      }
    }

    console.log(`\n🎉 Recalculation complete! Updated ${updatedCount} candidates. (${unchangedCount} skipped/no exp detected)`);
  } catch (error) {
    console.error('❌ Error during recalculation:', error);
  } finally {
    process.exit(0);
  }
}

recalculateAllExperience();
