import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
    console.error('👉 Make sure Redis is installed and running on your system.');
});

(async () => {
    try {
        await redisClient.connect();
        console.log('✅ Connected to Redis successfully');
    } catch (err) {
        console.error('❌ Could not connect to Redis', err);
    }
})();

export default redisClient;
