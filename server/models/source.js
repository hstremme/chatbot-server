import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema({ abbreviation: String, link_text: String, link_url: String });

export const Source = mongoose.model('Source', sourceSchema);