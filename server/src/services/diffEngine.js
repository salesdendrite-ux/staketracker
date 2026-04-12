const pool = require('../db/pool');
const logger = require('../utils/logger');
const { CHANGE_TYPES, CONSECUTIVE_MISSES_THRESHOLD } = require('../utils/constants');

/**
 * Diff Engine — compares scraped stakeholder data against stored records.
 * Detects: new stakeholders, title changes, reports_to changes, departures, returns.
 *
 * @param {string} companyId - UUID of the company
 * @param {Array} scrapedPeople - Array of { full_name, title, reports_to_name, linkedin_url }
 * @returns {Object} summary - { new_count, updated_count, departed_count, returned_count, unchanged_count }
 */
async function runDiffEngine(companyId, scrapedPeople) {
  const summary = {
    new_count: 0,
    updated_count: 0,
    departed_count: 0,
    returned_count: 0,
    unchanged_count: 0,
  };

  // 1. Fetch existing stakeholders for this company
  const existingResult = await pool.query(
    'SELECT * FROM stakeholders WHERE company_id = $1',
    [companyId]
  );
  const existingStakeholders = existingResult.rows;

  // 2. Build lookup maps
  const byLinkedIn = new Map();
  const byName = new Map();
  for (const s of existingStakeholders) {
    if (s.linkedin_url) {
      byLinkedIn.set(s.linkedin_url.toLowerCase().trim(), s);
    }
    byName.set(s.full_name.toLowerCase().trim(), s);
  }

  // Track which existing stakeholders were matched
  const matchedIds = new Set();

  // 3. Process each scraped person
  for (const person of scrapedPeople) {
    let match = null;

    // Priority 1: Match by LinkedIn URL
    if (person.linkedin_url) {
      match = byLinkedIn.get(person.linkedin_url.toLowerCase().trim());
    }

    // Priority 2: Match by name
    if (!match && person.full_name) {
      match = byName.get(person.full_name.toLowerCase().trim());
    }

    if (match) {
      matchedIds.add(match.id);

      // Check if person returned (was inactive)
      if (match.status === 'inactive') {
        await pool.query(
          `UPDATE stakeholders SET
            status = 'active', consecutive_misses = 0,
            marked_inactive_at = NULL, last_seen_at = NOW()
           WHERE id = $1`,
          [match.id]
        );
        await pool.query(
          `INSERT INTO change_log (stakeholder_id, company_id, change_type)
           VALUES ($1, $2, $3)`,
          [match.id, companyId, CHANGE_TYPES.RETURNED]
        );
        summary.returned_count++;
        logger.info(`Stakeholder returned: ${match.full_name}`, { companyId });
      }

      let changed = false;

      // Check title change
      if (person.title && person.title !== match.title) {
        await pool.query(
          `INSERT INTO change_log (stakeholder_id, company_id, change_type, field_name, old_value, new_value)
           VALUES ($1, $2, $3, 'title', $4, $5)`,
          [match.id, companyId, CHANGE_TYPES.TITLE_CHANGE, match.title, person.title]
        );
        await pool.query('UPDATE stakeholders SET title = $1 WHERE id = $2', [person.title, match.id]);
        changed = true;
        logger.info(`Title change: ${match.full_name}: ${match.title} → ${person.title}`, { companyId });
      }

      // Check reports_to change
      if (person.reports_to_name !== undefined && person.reports_to_name !== match.reports_to_name) {
        await pool.query(
          `INSERT INTO change_log (stakeholder_id, company_id, change_type, field_name, old_value, new_value)
           VALUES ($1, $2, $3, 'reports_to', $4, $5)`,
          [match.id, companyId, CHANGE_TYPES.REPORTS_TO_CHANGE, match.reports_to_name, person.reports_to_name]
        );
        await pool.query(
          'UPDATE stakeholders SET reports_to_name = $1 WHERE id = $2',
          [person.reports_to_name, match.id]
        );
        changed = true;
        logger.info(`Reports-to change: ${match.full_name}: ${match.reports_to_name} → ${person.reports_to_name}`, { companyId });
      }

      // Update last_seen_at and reset consecutive_misses
      await pool.query(
        'UPDATE stakeholders SET last_seen_at = NOW(), consecutive_misses = 0 WHERE id = $1',
        [match.id]
      );

      if (changed) {
        summary.updated_count++;
      } else {
        summary.unchanged_count++;
      }
    } else {
      // New stakeholder
      const insertResult = await pool.query(
        `INSERT INTO stakeholders (company_id, full_name, title, reports_to_name, linkedin_url, status, source)
         VALUES ($1, $2, $3, $4, $5, 'new', 'scraped')
         RETURNING id`,
        [companyId, person.full_name, person.title || null, person.reports_to_name || null, person.linkedin_url || null]
      );

      await pool.query(
        `INSERT INTO change_log (stakeholder_id, company_id, change_type)
         VALUES ($1, $2, $3)`,
        [insertResult.rows[0].id, companyId, CHANGE_TYPES.NEW_STAKEHOLDER]
      );

      summary.new_count++;
      logger.info(`New stakeholder: ${person.full_name}`, { companyId });
    }
  }

  // 4. Handle missing stakeholders — increment consecutive_misses
  for (const existing of existingStakeholders) {
    if (matchedIds.has(existing.id)) continue;
    if (existing.status === 'inactive') continue; // already inactive, skip
    if (existing.source === 'manual' && existing.status === 'new') continue; // don't penalize brand new manual entries

    const newMisses = (existing.consecutive_misses || 0) + 1;

    if (newMisses >= CONSECUTIVE_MISSES_THRESHOLD) {
      // Mark inactive after 2 consecutive misses
      await pool.query(
        `UPDATE stakeholders SET
          consecutive_misses = $1, status = 'inactive', marked_inactive_at = NOW()
         WHERE id = $2`,
        [newMisses, existing.id]
      );
      await pool.query(
        `INSERT INTO change_log (stakeholder_id, company_id, change_type)
         VALUES ($1, $2, $3)`,
        [existing.id, companyId, CHANGE_TYPES.DEPARTED]
      );
      summary.departed_count++;
      logger.info(`Stakeholder departed (${newMisses} misses): ${existing.full_name}`, { companyId });
    } else {
      await pool.query(
        'UPDATE stakeholders SET consecutive_misses = $1 WHERE id = $2',
        [newMisses, existing.id]
      );
      logger.info(`Stakeholder missed (${newMisses}/${CONSECUTIVE_MISSES_THRESHOLD}): ${existing.full_name}`, { companyId });
    }
  }

  return summary;
}

module.exports = { runDiffEngine };
