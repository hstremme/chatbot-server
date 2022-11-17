import {Namespace} from "../models/namespace.js";

export let openAiSelectedNamespace = null;

export async function updateSelectedNamespace(){
    const res = await Namespace.findOne({isSelected: true}).exec();
    openAiSelectedNamespace = res.value;
}
