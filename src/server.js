require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(require('./routes'));

app.listen(PORT, () => {
  console.log(`PDD 竞品分析工具运行中：http://localhost:${PORT}`);
});
