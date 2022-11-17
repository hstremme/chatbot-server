import mongoose from "mongoose";

const namespaceSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
        unique: true
    },
    isSelected: {
        type: Boolean,
        required: false,
    }
});

export const Namespace = mongoose.model('Namespace', namespaceSchema);