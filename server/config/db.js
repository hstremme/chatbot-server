import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ debug: true })

export const connectDB = mongoose.connect(process.env.MONGODB_URI)
    .catch(er => { console.log(er)})
    .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`)
    })