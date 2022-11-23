import mongoose from "mongoose";

const dialogSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true
    },
    count: {
        type: Number
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    question_de: {
        type: String,
        required: true
    },
    answer_de: {
        type: String,
        required: true
    }
    },
    {timestamps: true});

export const Dialog = mongoose.model('Dialog', dialogSchema);