const express = require('express');
const getGWSession = require('./app');

const app = express();
const port = 3000;

app.get('/get-wsession', async (req, res) => {
  try {
    const session = await getGWSession();
    res.json({ wsession: session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
