import path from 'path';
import { fileURLToPath } from 'url';

// emulate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

import express from 'express';

const app = express();

// now this works as before
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.render('home', { title: 'TrackVest Home' });
});

app.listen(3000, () => console.log('listening on 3000'));
