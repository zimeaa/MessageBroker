const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({
  origin: '*', // OK si no usas cookies ni auth con credenciales
  methods: ['GET', 'POST'],
  // credentials: true, // quitar o especificar origin si usas credenciales
}));

app.use(express.json());

app.use('/api', require('./routes')); // asegúrate que routes/index.js exporte router

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Message Broker listening on port ${PORT}`);
});
