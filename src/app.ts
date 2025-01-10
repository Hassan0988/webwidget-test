import express, { Application } from 'express';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Routes
app.use('/', routes);

app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    next();
  });
  
// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});