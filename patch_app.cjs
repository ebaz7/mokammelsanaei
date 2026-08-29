const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const priv = ensureValidWgKey(sub.wireguardPrivateKey, `sub_priv_${sub.id || sub.username}`);\n    const addr = isBridge ? `10.8.${safeIdx}.2/24` : (sub.wireguardAddress && sub.wireguardAddress.includes("/") ? sub.wireguardAddress : "10.8.0.2/24");',
  `const priv = ensureValidWgKey(sub.wireguardPrivateKey, \`sub_priv_\${sub.id || sub.username}\`);
    const subIdx = subscriptions.findIndex(s => s.id === sub.id);
    const clientIp = 100 + (subIdx >= 0 ? subIdx : 0);
    const addr = isBridge ? \`10.8.\${safeIdx}.\${clientIp}/24\` : (sub.wireguardAddress && sub.wireguardAddress.includes("/") ? sub.wireguardAddress : "10.8.0.2/24");`
);

fs.writeFileSync('src/App.tsx', code);
