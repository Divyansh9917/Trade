import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load our secret variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Allows our server to read JSON payloads
app.use(cors({
    origin: 'http://localhost:3000', // Strictly allows our Next.js client
    credentials: true
}));

// Health Check Route (Useful for verifying the server is alive)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'active', message: 'Trading Engine API is running.' });
});

// Database Connection & Server Initialization
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Trading Engine running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error.message);
        process.exit(1); // Stop the server if the database fails to connect
    });