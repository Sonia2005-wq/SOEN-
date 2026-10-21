import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";

export const authUser = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(401).send({ err: "Unauthenticated User" });
    }
    const isBlacklisted = await redisClient.get(token); 

    if (isBlacklisted) {
      return res.status(401).send({ err: "Unauthenticated User" });
    }

    const decoded = jwt.verify(token, process.env.SECRET); 
    req.user = decoded; 
    next(); 
  } catch (err) {
    return res.status(401).send({ err: "Unauthenticated User" });
  }
};
