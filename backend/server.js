require('dotenv').config();
const express = require('express');
const cors = require('cors');

const uploadController = require('./controllers/uploadController');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.post('/api/upload', uploadController.uploadResume);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
