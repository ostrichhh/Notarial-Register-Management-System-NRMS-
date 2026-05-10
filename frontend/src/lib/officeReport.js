import AxiosInstance from '../components/Axios.jsx';

const NOTARIAL_LIST_LABELS = {
  ACK: 'Acknowledged',
  CERT: 'Certified',
  SUB: 'Subscribed',
};

const REMARK_LIST_LABELS = {
  CR: 'Copy Retained',
  NCR: 'No Copy Retained',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatReportDate(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function resolveListTitle(data) {
  const filters = data?.filters || {};
  if (data?.report_type === 'notarial_acts') {
    const label = NOTARIAL_LIST_LABELS[filters.notarial_type_code] || filters.notarial_type || 'Notarial';
    return `List of ${label} Entries`;
  }
  if (data?.report_type === 'remarks') {
    const label = REMARK_LIST_LABELS[filters.remark_code] || filters.remark || 'Selected Remark';
    return `List of Entries with ${label}`;
  }
  return 'List of Entries';
}

function resolveCategoryLabel(data) {
  if (data?.report_type === 'remarks') return 'Remarks';
  if (data?.report_type === 'notarial_acts') return 'Notarial type';
  return 'Report';
}

function buildRows(entries = []) {
  if (!entries.length) {
    return `
      <tr>
        <td colspan="6" class="empty">No entries found for this selection.</td>
      </tr>
    `;
  }

  return entries
    .map(
      (entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.book_number)}</td>
          <td>${escapeHtml(entry.page_number)}</td>
          <td>${escapeHtml(entry.entry_number)}</td>
          <td>${escapeHtml(entry.title)}</td>
          <td>${escapeHtml(formatDateTime(entry.date_time))}</td>
        </tr>
      `
    )
    .join('');
}

function resolveEntrySummary(data) {
  const filters = data?.filters || {};
  const count = Array.isArray(data?.entries) ? data.entries.length : 0;

  if (data?.report_type === 'notarial_acts') {
    const label = NOTARIAL_LIST_LABELS[filters.notarial_type_code] || filters.notarial_type || 'selected notarial type';
    return `Showing ${count} of ${label} Entries`;
  }

  if (data?.report_type === 'remarks') {
    const label = filters.remark_code === 'NCR'
      ? 'No copy retained'
      : REMARK_LIST_LABELS[filters.remark_code] || filters.remark || 'selected remark';
    return `Showing ${count} of ${label} Entries`;
  }

  return '';
}

function buildPrintableReport(data) {
  const filters = data?.filters || {};
  const listTitle = resolveListTitle(data);
  const categoryLabel = resolveCategoryLabel(data);
  const entrySummary = resolveEntrySummary(data);
  const bookLabel = filters.book || 'All books';
  const generatedDate = formatReportDate(data?.generated_at);
  const logoUrl = `${window.location.origin}/ocasion-logo-light.png`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(listTitle)}</title>
  <style>
    @page { size: 8.5in 13in; margin: 0.55in 0.48in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
    }
    .report {
      width: 100%;
      min-height: 11.9in;
      padding-top: 0.1in;
    }
    .report-header {
      display: grid;
      grid-template-columns: 96px 1fr 96px;
      align-items: center;
      min-height: 74px;
    }
    .report-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
    }
    .office-heading {
      margin: 0;
      text-align: center;
      font-size: 18px;
      line-height: 1.35;
      font-weight: 400;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 32px;
      margin-top: 36px;
      font-size: 13px;
    }
    .meta-right {
      display: flex;
      align-items: center;
      gap: 22px;
      white-space: nowrap;
    }
    .line-value {
      display: inline-block;
      min-width: 92px;
      padding: 0 8px 2px;
      border-bottom: 1px solid #000;
      text-align: center;
    }
    .date-value {
      min-width: 138px;
    }
    .list-title {
      margin: 44px 0 42px;
      font-size: 13px;
      font-weight: 400;
    }
    .list-title strong {
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 13px;
    }
    th,
    td {
      border: 1px solid #000;
      padding: 4px 10px;
      text-align: left;
      vertical-align: top;
      min-height: 24px;
      word-break: break-word;
    }
    th {
      font-weight: 400;
    }
    th:nth-child(1),
    td:nth-child(1) {
      width: 6%;
    }
    th:nth-child(2),
    td:nth-child(2) {
      width: 17%;
    }
    th:nth-child(3),
    td:nth-child(3) {
      width: 8%;
    }
    th:nth-child(4),
    td:nth-child(4) {
      width: 17%;
    }
    th:nth-child(5),
    td:nth-child(5) {
      width: 27%;
    }
    th:nth-child(6),
    td:nth-child(6) {
      width: 25%;
    }
    .empty {
      text-align: center;
      color: #555;
      padding: 18px;
    }
    .entry-summary {
      margin-top: 12px;
      font-size: 12px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="report-header">
      <img class="report-logo" src="${escapeHtml(logoUrl)}" alt="Occasion Law Office logo" />
      <h1 class="office-heading">
        Occasion Law Office<br />
        And Notary Public<br />
        Monitoring
      </h1>
      <div aria-hidden="true"></div>
    </header>

    <section class="meta-row">
      <div>${escapeHtml(categoryLabel)}</div>
      <div class="meta-right">
        <span>Book no:<span class="line-value">${escapeHtml(bookLabel)}</span></span>
        <span>Date:<span class="line-value date-value">${escapeHtml(generatedDate)}</span></span>
      </div>
    </section>

    <p class="list-title">${escapeHtml(listTitle)}</p>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Book Number</th>
          <th>Page</th>
          <th>Entry Number</th>
          <th>Title</th>
          <th>Date and Time</th>
        </tr>
      </thead>
      <tbody>
        ${buildRows(data?.entries)}
      </tbody>
    </table>
    ${entrySummary ? `<p class="entry-summary">${escapeHtml(entrySummary)}</p>` : ''}
  </main>
</body>
</html>`;
}

/** Opens the generated report as a printable list. */
export async function downloadOfficeReport(options = {}) {
  const { data } = await AxiosInstance.post('/reports/generate/', options);
  const html = buildPrintableReport(data);
  const reportWindow = window.open('', '_blank');

  if (reportWindow) {
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 250);
    return;
  }

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const reportType = options.report_type || 'report';
  anchor.href = url;
  anchor.download = `nrms-${reportType}-list-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}
