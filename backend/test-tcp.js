const net = require('net');
console.log('Attempting TCP connect to 127.0.0.1:27017...');
const client = net.createConnection({ port: 27017, host: '127.0.0.1' }, () => {
  console.log('SUCCESS: TCP Connected to MongoDB port!');
  client.end();
});
client.setTimeout(3000, () => {
  console.log('ERROR: TCP Connection Timed Out!');
  client.destroy();
});
client.on('error', (err) => {
  console.log('TCP Error:', err.message);
});
