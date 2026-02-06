import express from 'express';
import api from './api/index.js';

const app = express();

app.use('/',express.static('pages'));

app.use('/api', api);


const defaultPort = 9999;
const envPort = Number(process.env.PORT);
const port = Number.isFinite(envPort) && envPort > 0 ? envPort : defaultPort;

const server = app.listen(port, () => {
    console.log(`Server is running at http://127.0.0.1:${port}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Try: set PORT=9998 && yarn start`);
        return;
    }
    console.error('Server error:', err);
});