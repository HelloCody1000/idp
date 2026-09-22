const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World from js-app\n');
});

server.listen(port, () => {
  console.log(`js-app listening on port ${port}`);
});
