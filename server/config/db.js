import mongoose from 'mongoose';

export const connectDB = mongoose.connect(process.env.MONGODB_URI)
    .catch(er => { console.log(er)})
    .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`)
    })