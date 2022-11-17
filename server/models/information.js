import mongoose from "mongoose";

const informationSchema = new mongoose.Schema({
    infoID:{
        type: String,
        required: true,
        unique: true
    },
    heading: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: false
    },
    namespace: {
        type: String
    },
    //TODO rename to isEmbedded
    hasEmbedding: {
        type: Boolean,
        required: true,
        default: false
    }
});

export const Information = mongoose.model('Information', informationSchema);