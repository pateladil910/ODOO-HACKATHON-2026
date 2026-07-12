const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/documents');

const filenames = [
  'Registration_VAN-01.pdf',
  'Insurance_VAN-01.pdf',
  'Registration_TRK-02.pdf',
  'Insurance_TRK-02.pdf',
  'Registration_VAN-03.pdf',
  'Insurance_VAN-03.pdf',
  'Registration_TRK-04.pdf',
  'Insurance_TRK-04.pdf',
  'Registration_VAN-05.pdf',
  'Insurance_VAN-05.pdf'
];

const generatePdfContent = (docName) => {
  const streamContent = `BT /F1 20 Tf 70 750 Td (TransitOps Fleet Management) Tj /F1 14 Tf 0 -50 Td (Official compliance document: ${docName}) Tj 0 -30 Td (Status: ACTIVE & VERIFIED) Tj 0 -25 Td (This certificate verifies active registration and insurance logs.) Tj 0 -40 Td (Generated dynamically on: ${new Date().toLocaleDateString()}) Tj ET`;
  const streamLength = streamContent.length;

  const pdfParts = [
    `%PDF-1.4\n%âãÏÓ\n`,
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  ];

  const offsets = [];
  let currentOffset = 0;
  for (let i = 1; i < pdfParts.length; i++) {
    currentOffset += pdfParts[i - 1].length;
    offsets.push(currentOffset);
  }

  const startXref = currentOffset + pdfParts[pdfParts.length - 1].length;
  const padOffset = (offset) => String(offset).padStart(10, '0');

  const pdf = pdfParts.join('') +
    `xref\r\n0 6\r\n0000000000 65535 f\r\n` +
    `${padOffset(offsets[0])} 00000 n\r\n` +
    `${padOffset(offsets[1])} 00000 n\r\n` +
    `${padOffset(offsets[2])} 00000 n\r\n` +
    `${padOffset(offsets[3])} 00000 n\r\n` +
    `${padOffset(offsets[4])} 00000 n\r\n` +
    `trailer\r\n<< /Size 6 /Root 1 0 R >>\r\n` +
    `startxref\r\n${startXref}\r\n%%EOF\r\n`;

  return pdf;
};

const run = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  filenames.forEach(filename => {
    const docName = filename.replace(/_/g, ' ').replace('.pdf', '');
    const content = generatePdfContent(docName);
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), content, 'binary');
    console.log(`[Seed PDF] Generated ${filename}`);
  });
  console.log('[Seed PDF] All documents seeded successfully.');
};

run();
