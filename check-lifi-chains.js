// Check which chains LI.FI actually supports
const https = require('https');

https.get('https://li.quest/v1/chains', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const chains = JSON.parse(data);
    console.log('\n=== LI.FI Supported Chains (First 20) ===\n');
    chains.chains.slice(0, 20).forEach(chain => {
      const testnetMarker = chain.chainType === 'TVM' || chain.name.toLowerCase().includes('test') || chain.name.toLowerCase().includes('sepolia') ? '✅ TESTNET' : '❌ MAINNET';
      console.log(`${chain.id.toString().padEnd(10)} ${chain.name.padEnd(25)} ${testnetMarker}`);
    });
    
    console.log('\n=== Looking for Testnets ===\n');
    const testnets = chains.chains.filter(c => 
      c.name.toLowerCase().includes('test') || 
      c.name.toLowerCase().includes('sepolia') ||
      c.name.toLowerCase().includes('goerli') ||
      c.name.toLowerCase().includes('amoy')
    );
    
    if (testnets.length > 0) {
      testnets.forEach(chain => {
        console.log(`${chain.id.toString().padEnd(10)} ${chain.name}`);
      });
    } else {
      console.log('❌ NO TESTNETS FOUND - LI.FI ONLY SUPPORTS MAINNET CHAINS');
    }
  });
}).on('error', err => console.error('Error:', err.message));
