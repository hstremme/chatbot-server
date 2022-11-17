import express from 'express';
import bodyParser from "body-parser";
import { connectDB } from './config/db.js'
import { api } from "./routes/api.js";
import cors from 'cors';
import {openAiSelectedNamespace,updateSelectedNamespace} from "./config/kbConfig.js";
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors())
app.use('/api', api);
await connectDB;
await updateSelectedNamespace();

const port = process.env.PORT;

app.listen(port, () => console.log(`Server started on port ${port}`));