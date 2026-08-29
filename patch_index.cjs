const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const errorHandler = `
    <script>
      window.addEventListener('error', function(e) {
        document.body.innerHTML = '<div style="padding: 20px; background: red; color: white; font-family: monospace; z-index: 999999; position: fixed; inset: 0; overflow: auto;"><h2>React Crash!</h2><pre>' + e.message + '\\n' + e.filename + ':' + e.lineno + ':' + e.colno + '\\n' + (e.error && e.error.stack ? e.error.stack : '') + '</pre></div>';
      });
      window.addEventListener('unhandledrejection', function(e) {
        document.body.innerHTML = '<div style="padding: 20px; background: red; color: white; font-family: monospace; z-index: 999999; position: fixed; inset: 0; overflow: auto;"><h2>Unhandled Promise Rejection!</h2><pre>' + e.reason + '</pre></div>';
      });
    </script>
`;

if (!html.includes('Crash!')) {
  html = html.replace('</head>', errorHandler + '</head>');
  fs.writeFileSync('index.html', html);
}
