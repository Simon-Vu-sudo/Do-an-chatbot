const cors = require('cors');

app.use(cors({
  origin: '*', // Trong môi trường development
  // origin: 'http://your-production-domain.com', // Trong môi trường production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
})); 