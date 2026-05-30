const fs = require('fs');

const faqPath = 'src/app/(public)/faq/page.tsx';
let faqContent = fs.readFileSync(faqPath, 'utf8');
// Clean up any repeated "as const"
faqContent = faqContent.replace(/type:\s*'spring'(\s+as\s+const)+/g, "type: 'spring' as const");
fs.writeFileSync(faqPath, faqContent, 'utf8');
console.log('Cleaned FAQ page successfully!');

const qsPath = 'src/app/(public)/quem-somos/QuemSomosClient.tsx';
let qsContent = fs.readFileSync(qsPath, 'utf8');
// Clean up any repeated "as const"
qsContent = qsContent.replace(/type:\s*'spring'(\s+as\s+const)+/g, "type: 'spring' as const");
fs.writeFileSync(qsPath, qsContent, 'utf8');
console.log('Cleaned QuemSomosClient page successfully!');
