const fs = require('fs');

console.log('🔧 Fixing Markdown parsing errors in bot.js...\n');

// Read the bot.js file
let content = fs.readFileSync('bot.js', 'utf8');

// Count original occurrences
const originalMatches = content.match(/sendMessage\([^,]+,\s*`[^`]*\$\{error\.message\}/g);
console.log(`📊 Found ${originalMatches ? originalMatches.length : 0} error.message usages to fix`);

// Replace all occurrences of ${error.message} with ${escapeMarkdown(error.message)}
// But skip the one that's already fixed
const fixedContent = content.replace(
    /(\$\{error\.message\})/g, 
    '${escapeMarkdown(error.message)}'
);

// Count after replacement
const newMatches = fixedContent.match(/sendMessage\([^,]+,\s*`[^`]*\$\{escapeMarkdown\(error\.message\)\}/g);
console.log(`✅ After fix: ${newMatches ? newMatches.length : 0} error.message usages are now escaped`);

// Write the fixed content back
fs.writeFileSync('bot.js', fixedContent, 'utf8');

console.log('✅ All error.message usages have been escaped to prevent Markdown parsing errors!');
console.log('\n📋 Changes made:');
console.log('   ${error.message} → ${escapeMarkdown(error.message)}');
console.log('\n🎯 This will prevent Telegram "can\'t parse entities" errors!');
