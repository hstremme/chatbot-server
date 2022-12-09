import {Namespace} from "../models/namespace.js";

export let openAiSelectedNamespace = null;
export let confidenceMin = 0.75;

export async function updateSelectedNamespace(){
    const res = await Namespace.findOne({isSelected: true}).exec();
    openAiSelectedNamespace = res.value;
}
