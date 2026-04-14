const logger = require('../utils/logger');

/**
 * Scraper Service
 * Provides TheOrg and LinkedIn scrapers.
 * Both return normalized format: [{ full_name, title, reports_to_name, linkedin_url }]
 */

// ─── TheOrg Scraper ────────────────────────────────────────────────
async function scrapeTheOrg(orgUrl) {
  let browser;
  try {
    const puppeteer = require('puppeteer');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions', '--single-process', '--no-zygote'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    logger.info(`Scraping TheOrg: ${orgUrl}`);
    await page.goto(orgUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for org chart to render
    await page.waitForSelector('[data-testid="org-chart"], .org-chart, .team-member, [class*="PersonCard"], [class*="person"]', {
      timeout: 15000,
    }).catch(() => logger.warn('Org chart selector not found, trying fallback extraction'));

    // Extract person data from the page
    const people = await page.evaluate(() => {
      const results = [];
      // Try multiple selector strategies
      const selectors = [
        '[data-testid="person-card"]',
        '[class*="PersonCard"]',
        '[class*="person-card"]',
        '.team-member',
        'a[href*="/org/"][href*="/positions/"]',
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }

      cards.forEach((card) => {
        const nameEl = card.querySelector('h3, h4, [class*="name"], [class*="Name"], strong');
        const titleEl = card.querySelector('p, span[class*="title"], [class*="Title"], [class*="role"]');
        const linkedinEl = card.querySelector('a[href*="linkedin.com"]');

        if (nameEl) {
          results.push({
            full_name: nameEl.textContent.trim(),
            title: titleEl ? titleEl.textContent.trim() : null,
            reports_to_name: null, // Will be inferred from hierarchy if possible
            linkedin_url: linkedinEl ? linkedinEl.href : null,
          });
        }
      });

      return results;
    });

    // Rate limiting: wait 2-4 seconds
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));

    logger.info(`TheOrg scraped ${people.length} people from ${orgUrl}`);
    return people;
  } catch (err) {
    logger.error(`TheOrg scrape failed: ${err.message}`, { orgUrl });
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

// ─── LinkedIn Scraper ──────────────────────────────────────────────
async function scrapeLinkedIn(linkedinUrl, sessionCookie) {
  let browser;
  try {
    const puppeteerExtra = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteerExtra.use(StealthPlugin());

    browser = await puppeteerExtra.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions', '--single-process', '--no-zygote'],
    });

    const page = await browser.newPage();

    // Set LinkedIn session cookie
    if (sessionCookie) {
      await page.setCookie({
        name: 'li_at',
        value: sessionCookie.replace('li_at=', ''),
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
    }

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to company people page
    const peopleUrl = linkedinUrl.replace(/\/$/, '') + '/people/';
    logger.info(`Scraping LinkedIn: ${peopleUrl}`);
    await page.goto(peopleUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Check for CAPTCHA
    const captcha = await page.$('[class*="captcha"], #captcha, [id*="challenge"]');
    if (captcha) {
      throw new Error('CAPTCHA detected');
    }

    // Scroll to load more profiles (up to 50)
    let totalProfiles = 0;
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));

      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('[class*="org-people-profile-card"], [data-test*="people-card"], li[class*="people"]').length;
      });

      if (currentCount === totalProfiles || currentCount >= 50) break;
      totalProfiles = currentCount;
    }

    const people = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll(
        '[class*="org-people-profile-card"], [data-test*="people-card"], li[class*="people"]'
      );

      cards.forEach((card) => {
        const nameEl = card.querySelector('[class*="artdeco-entity-lockup__title"], [class*="name"], a[href*="/in/"]');
        const titleEl = card.querySelector('[class*="artdeco-entity-lockup__subtitle"], [class*="title"]');
        const profileLink = card.querySelector('a[href*="/in/"]');

        if (nameEl) {
          results.push({
            full_name: nameEl.textContent.trim(),
            title: titleEl ? titleEl.textContent.trim() : null,
            reports_to_name: null,
            linkedin_url: profileLink ? profileLink.href.split('?')[0] : null,
          });
        }
      });

      return results;
    });

    logger.info(`LinkedIn scraped ${people.length} people from ${linkedinUrl}`);
    return people;
  } catch (err) {
    logger.error(`LinkedIn scrape failed: ${err.message}`, { linkedinUrl });
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Main scrape function — tries TheOrg first, falls back to LinkedIn.
 */
async function scrapeCompany(company) {
  let people = [];

  // Try TheOrg first
  if (company.org_url) {
    try {
      people = await scrapeTheOrg(company.org_url);
      if (people.length > 0) return people;
    } catch (err) {
      logger.warn(`TheOrg failed for ${company.name}, trying LinkedIn`, { error: err.message });
    }
  }

  // Fall back to LinkedIn
  if (company.linkedin_url) {
    const linkedinCookie = process.env.LINKEDIN_COOKIE || '';
    const maxRetries = 3;
    const backoffMs = [5000, 15000, 45000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        people = await scrapeLinkedIn(company.linkedin_url, linkedinCookie);
        return people;
      } catch (err) {
        if (err.message === 'CAPTCHA detected') {
          throw err; // Don't retry on CAPTCHA
        }
        if (attempt < maxRetries - 1) {
          logger.warn(`LinkedIn attempt ${attempt + 1} failed, retrying in ${backoffMs[attempt]}ms`);
          await new Promise((r) => setTimeout(r, backoffMs[attempt]));
        } else {
          throw err;
        }
      }
    }
  }

  if (people.length === 0) {
    throw new Error('No scraping source available or no data found');
  }

  return people;
}

module.exports = { scrapeCompany, scrapeTheOrg, scrapeLinkedIn };
