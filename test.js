const key = 'amount'; 
const regex1 = new RegExp('{{\\s*' + key + '\\s*}}', 'g'); 
const regex2 = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
console.log('Test 1 (Original code):', '{{ amount }}'.replace(regex1, '500'));
console.log('Test 2 (My fix):', '{{ amount }}'.replace(regex2, '500'));
