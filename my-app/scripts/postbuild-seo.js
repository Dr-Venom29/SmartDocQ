const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../build');
const BASE_URL = 'https://smartdocq.vercel.app';

if (!fs.existsSync(BUILD_DIR)) {
  console.error('Build directory does not exist. Run react-scripts build first.');
  process.exit(1);
}

const baseHtmlPath = path.join(BUILD_DIR, 'index.html');
const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');

const pages = [
  {
    route: '/',
    filePath: path.join(BUILD_DIR, 'index.html'),
    title: 'SmartDocQ – AI PDF Chat, Document Summarizer & Research Assistant',
    description: 'Chat with PDFs, get citation-backed answers, summarize documents, and create quizzes and flashcards. Supports PDF, Word, Excel, CSV, and TXT.',
    canonical: `${BASE_URL}/`
  },
  {
    route: '/help',
    filePath: path.join(BUILD_DIR, 'help', 'index.html'),
    title: 'Help Center - SmartDocQ',
    description: 'Find SmartDocQ guides, document upload instructions, security information, FAQs, and troubleshooting help.',
    canonical: `${BASE_URL}/help`
  },
  {
    route: '/privacy',
    filePath: path.join(BUILD_DIR, 'privacy', 'index.html'),
    title: 'Privacy Policy - SmartDocQ',
    description: 'Learn how SmartDocQ collects, processes, protects, and manages your account and document data.',
    canonical: `${BASE_URL}/privacy`
  },
  {
    route: '/terms',
    filePath: path.join(BUILD_DIR, 'terms', 'index.html'),
    title: 'Terms of Service - SmartDocQ',
    description: 'Review the SmartDocQ terms of service, acceptable use requirements, limitations, and service policies.',
    canonical: `${BASE_URL}/terms`
  }
];

function injectSeo(html, { title, description, canonical }) {
  let result = html;

  // Remove existing SEO tags so we don't end up with duplicates
  result = result
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\b[^>]*\bname=["']description["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*\bname=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');

  const seoTags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
  `.trim();

  result = result.replace('</head>', `    ${seoTags}\n  </head>`);

  return result;
}

console.log('Generating post-build static SEO HTML files...');

pages.forEach((page) => {
  const pageHtml = injectSeo(baseHtml, page);
  const dir = path.dirname(page.filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(page.filePath, pageHtml, 'utf8');
  console.log(`  ✓ Generated static SEO HTML for route '${page.route}' -> ${path.relative(BUILD_DIR, page.filePath)}`);
});

console.log('Post-build static SEO HTML generation complete.');