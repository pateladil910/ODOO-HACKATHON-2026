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
  // Extract vehicle code if present (e.g. "Registration VAN-01" -> "VAN-01")
  const words = docName.split(' ');
  const vehicleReg = words.length > 1 ? words.slice(1).join(' ') : 'N/A';
  const cleanDocName = words.length > 0 ? words[0] + (words.length > 2 ? ' ' + words[1] : '') : docName;

  const escapePdf = (text) => String(text || '').replace(/[\(\)\\]/g, '\\$&');

  const streamContent = [
    // Page border (blue-grey)
    `q 0.12 0.16 0.23 RG 2 w 20 20 555 802 re S Q`,
    
    // Header Banner Block (dark navy)
    `q 0.08 0.18 0.36 rg 20 720 555 102 re f Q`,
    
    // Header text (White & Gold)
    `q 1 1 1 rg BT /F1 20 Tf 50 772 Td (TRANSITOPS COMPLIANCE REGISTRY) Tj ET Q`,
    `q 0.93 0.72 0.16 rg BT /F1 11 Tf 50 742 Td (OFFICIAL VEHICLE COMPLIANCE CERTIFICATE) Tj ET Q`,
    
    // Document Title
    `q 0.08 0.18 0.36 rg BT /F1 18 Tf 50 670 Td (${escapePdf(cleanDocName.toUpperCase())}) Tj ET Q`,
    
    // Grey Divider Line 1
    `q 0.85 0.85 0.85 RG 1 w 50 645 m 545 645 l S Q`,
    
    // Details Header
    `q 0.4 0.4 0.45 rg BT /F1 10 Tf 50 620 Td (VEHICLE COMPLIANCE METADATA) Tj ET Q`,
    
    // Detail Item: Vehicle Registration
    `q 0.3 0.3 0.35 rg BT /F1 12 Tf 50 590 Td (Vehicle Registration Number:) Tj ET Q`,
    `q 0.08 0.18 0.36 rg BT /F1 12 Tf 260 590 Td (${escapePdf(vehicleReg)}) Tj ET Q`,
    
    // Detail Item: Document Category
    `q 0.3 0.3 0.35 rg BT /F1 12 Tf 50 560 Td (Document Category:) Tj ET Q`,
    `q 0.1 0.1 0.1 rg BT /F1 12 Tf 260 560 Td (${escapePdf(docName)}) Tj ET Q`,
    
    // Detail Item: Verification Date
    `q 0.3 0.3 0.35 rg BT /F1 12 Tf 50 530 Td (Verification Timestamp:) Tj ET Q`,
    `q 0.1 0.1 0.1 rg BT /F1 12 Tf 260 530 Td (${escapePdf(new Date().toLocaleDateString())} 09:00:00 UTC) Tj ET Q`,
    
    // Grey Divider Line 2
    `q 0.85 0.85 0.85 RG 1 w 50 500 m 545 500 l S Q`,
    
    // Status Badge - Green Box
    `q 0.85 0.98 0.93 rg 50 445 180 30 re f Q`,
    // Status Badge Border
    `q 0.3 0.7 0.5 RG 1 w 50 445 180 30 re S Q`,
    // Status Badge Text
    `q 0.09 0.44 0.27 rg BT /F1 10 Tf 70 456 Td (STATUS: ACTIVE & VERIFIED) Tj ET Q`,
    
    // Verification description
    `q 0.3 0.3 0.35 rg BT /F1 11 Tf 50 400 Td (This certificate acts as an official record of the active status, license validity,) Tj ET Q`,
    `q 0.3 0.3 0.35 rg BT /F1 11 Tf 50 382 Td (and compliance logs for the registered fleet asset under TransitOps protocols.) Tj ET Q`,
    
    // Bottom seal text / signature placeholder
    `q 0.85 0.85 0.85 RG 1 w 350 140 m 510 140 l S Q`,
    `q 0.5 0.5 0.55 rg BT /F1 9 Tf 380 122 Td (Authorized Signatory) Tj ET Q`,
    `q 0.08 0.18 0.36 rg BT /F1 14 Tf 375 148 Td (TransitOps Security) Tj ET Q`,
    
    // Footer notice
    `q 0.6 0.6 0.65 rg BT /F1 9 Tf 50 60 Td (TransitOps Smart Fleet Solutions | Secure Compliance Document Registry) Tj ET Q`
  ].join('\n');

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
