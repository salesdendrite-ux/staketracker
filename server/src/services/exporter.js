const ExcelJS = require('exceljs');
const pool = require('../db/pool');

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
const STATUS_FILLS = {
  active: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } },
  new: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' } },
  inactive: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } },
};

function styleHeaders(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 24;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function autoWidth(sheet) {
  sheet.columns.forEach((col) => {
    let maxLen = col.header ? col.header.length : 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      maxLen = Math.max(maxLen, val.length);
    });
    col.width = Math.min(maxLen + 4, 50);
  });
}

function addStakeholderSheet(workbook, sheetName, stakeholders) {
  const sheet = workbook.addWorksheet(sheetName.substring(0, 31));

  sheet.columns = [
    { header: 'Full Name', key: 'full_name' },
    { header: 'Title', key: 'title' },
    { header: 'Reports To', key: 'reports_to_name' },
    { header: 'LinkedIn URL', key: 'linkedin_url' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Status', key: 'status' },
    { header: 'First Seen', key: 'first_seen_at' },
    { header: 'Last Updated', key: 'last_seen_at' },
  ];

  for (const s of stakeholders) {
    const row = sheet.addRow({
      full_name: s.full_name,
      title: s.title || '',
      reports_to_name: s.reports_to_name || '',
      linkedin_url: s.linkedin_url || '',
      email: s.email || '',
      phone: s.phone || '',
      status: s.status,
      first_seen_at: s.first_seen_at ? new Date(s.first_seen_at).toLocaleDateString() : '',
      last_seen_at: s.last_seen_at ? new Date(s.last_seen_at).toLocaleDateString() : '',
    });

    // LinkedIn hyperlink
    if (s.linkedin_url) {
      const cell = row.getCell('linkedin_url');
      cell.value = { text: s.linkedin_url, hyperlink: s.linkedin_url };
      cell.font = { color: { argb: 'FF0563C1' }, underline: true };
    }

    // Status conditional formatting
    const statusCell = row.getCell('status');
    if (STATUS_FILLS[s.status]) {
      statusCell.fill = STATUS_FILLS[s.status];
    }
  }

  styleHeaders(sheet);
  autoWidth(sheet);
  return sheet;
}

function addChangeLogSheet(workbook, sheetName, changes) {
  const sheet = workbook.addWorksheet(sheetName.substring(0, 31));

  sheet.columns = [
    { header: 'Date', key: 'detected_at' },
    { header: 'Stakeholder Name', key: 'stakeholder_name' },
    { header: 'Change Type', key: 'change_type' },
    { header: 'Field', key: 'field_name' },
    { header: 'Old Value', key: 'old_value' },
    { header: 'New Value', key: 'new_value' },
  ];

  if (changes[0] && changes[0].company_name !== undefined) {
    sheet.spliceColumns(2, 0, { header: 'Company', key: 'company_name' });
  }

  for (const c of changes) {
    const rowData = {
      detected_at: c.detected_at ? new Date(c.detected_at).toLocaleDateString() : '',
      stakeholder_name: c.stakeholder_name || c.full_name || '',
      change_type: c.change_type,
      field_name: c.field_name || '',
      old_value: c.old_value || '',
      new_value: c.new_value || '',
    };
    if (c.company_name !== undefined) {
      rowData.company_name = c.company_name;
    }
    sheet.addRow(rowData);
  }

  styleHeaders(sheet);
  autoWidth(sheet);
  return sheet;
}

/**
 * Export a single company to Excel buffer
 */
async function exportCompany(companyId) {
  const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
  if (companyResult.rows.length === 0) throw new Error('Company not found');
  const company = companyResult.rows[0];

  const stakeholders = await pool.query(
    'SELECT * FROM stakeholders WHERE company_id = $1 ORDER BY full_name',
    [companyId]
  );

  const changes = await pool.query(
    `SELECT cl.*, s.full_name AS stakeholder_name
     FROM change_log cl
     JOIN stakeholders s ON cl.stakeholder_id = s.id
     WHERE cl.company_id = $1
     ORDER BY cl.detected_at DESC`,
    [companyId]
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StakeTracker';
  workbook.created = new Date();

  addStakeholderSheet(workbook, 'Stakeholders', stakeholders.rows);
  addChangeLogSheet(workbook, 'Change Log', changes.rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_Stakeholders_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { buffer, filename };
}

/**
 * Export all companies to a single Excel workbook
 */
async function exportAll() {
  const companies = await pool.query('SELECT * FROM companies ORDER BY name');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StakeTracker';
  workbook.created = new Date();

  for (const company of companies.rows) {
    const stakeholders = await pool.query(
      'SELECT * FROM stakeholders WHERE company_id = $1 ORDER BY full_name',
      [company.id]
    );
    addStakeholderSheet(workbook, company.name, stakeholders.rows);
  }

  // All Changes sheet
  const allChanges = await pool.query(
    `SELECT cl.*, s.full_name AS stakeholder_name, c.name AS company_name
     FROM change_log cl
     JOIN stakeholders s ON cl.stakeholder_id = s.id
     JOIN companies c ON cl.company_id = c.id
     ORDER BY cl.detected_at DESC`
  );
  addChangeLogSheet(workbook, 'All Changes', allChanges.rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `StakeTracker_All_Companies_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { buffer, filename };
}

module.exports = { exportCompany, exportAll };
