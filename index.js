import express from 'express';
import api from './api/index.js';

const app = express();

app.use('/',express.static('pages'));

app.use('/api', api);


const port  = 9999;

app.listen(port, () => {
    console.log(`Server is running at http://127.0.0.1:${port}`);
});