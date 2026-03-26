const express = require('express');
const cors = require('cors');
const videoRouter = require('./routes/video');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/video', videoRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '视频去水印服务运行中' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
