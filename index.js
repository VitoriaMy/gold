import express from 'express';
import api from './api/index.js';

const app = express();

app.use('/',express.static('pages'));

app.use('/api', api);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});