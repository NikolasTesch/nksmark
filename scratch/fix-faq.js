const fs = require('fs');

const files = [
  'src/app/(public)/faq/page.tsx',
  'src/app/(public)/quem-somos/QuemSomosClient.tsx'
];

const target = "type: 'spring'";
const replacement = "type: 'spring' as const";

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(target)) {
      content = content.replaceAll(target, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Replaced successfully in ${filePath}!`);
    } else {
      console.log(`Target string already replaced or not found in ${filePath}.`);
    }
  } else {
    console.error(`File ${filePath} does not exist.`);
  }
});
