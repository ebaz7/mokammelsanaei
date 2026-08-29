const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The original UI rendering code:
// const port = inb?.wgPort || inb?.port || wgServerPortState || 51820;
// We need to replace it with the bridge-aware logic.
// There are multiple instances of this.

const newPortLogic = `const port = bridgeRoutingEnabled ? (inb?.bridgeWgPort || (51820 + (inbounds.findIndex(i => i.id === inb?.id) >= 0 ? inbounds.findIndex(i => i.id === inb?.id) : 0))) : (inb?.wgPort || inb?.port || wgServerPortState || 51820);`;

code = code.replace(/const port = inb\?\.wgPort \|\| inb\?\.port \|\| wgServerPortState \|\| 51820;/g, newPortLogic);

fs.writeFileSync('src/App.tsx', code);
