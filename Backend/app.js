import express from 'express'; 
import morgan from 'morgan'; 
import connect from './db/db.js'; 
import userRoutes from './routes/user.routes.js'; 
import cookieParser from 'cookie-parser';
import projectRoutes from './routes/project.routes.js'; 
import aiRoutes from './routes/ai.routes.js'; 
import cors from 'cors'; 
const app = express(); 

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({extended: true})); 
app.use(cookieParser()); 

app.use('/user', userRoutes); 
app.use('/projects', projectRoutes); 
app.use('/ai', aiRoutes); 

app.get('/', (req, res) => {
    res.send("hello world"); 
}); 

export default app; 