import Redis from "ioredis";

const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
    connectTimeout: 10000,
    maxRetriesPerRequest: 1
});

redisClient.on("connect", () => {
    console.log("Redis connected successfully");
});

redisClient.on("error", (err) => {
    console.error("Redis connection error:", err.message);
});

export default redisClient;