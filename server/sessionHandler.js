import { v4 as uuidv4 } from 'uuid';
import {Dialog} from "./models/dialog.js";

export async function addDialog(dialog_en, dialog_de, sessionId, count, prompt){
    const dialog = new Dialog({
        'sessionId': sessionId,
        'count': count,
        'question': dialog_en.question,
        'answer': dialog_en.answer,
        'question_de': dialog_de.question,
        'answer_de': dialog_de.answer,
        prompt
    });
    dialog.save();
    return dialog.id;
}

async function getDialogHistory(sessionId, language){
    try {
        let res = null;
        if (language === 'german'){
            res = await Dialog.find({sessionId: sessionId}, 'count question_de answer_de prompt').exec();
        } else if (language === 'english'){
            res = await Dialog.find({sessionId: sessionId}, 'count question answer').exec();
        }
        return res;
    } catch (e) {
        console.log(e);
    }
}

export async function getDialogHistoryGerman(sessionId){
    return new Promise(async (resolve, reject) => {
        try {
            const data = await getDialogHistory(sessionId, 'german');
            resolve(data);
        } catch (e) {
            reject();
        }
    });
}

export async function getDialogHistoryEnglish(sessionId){
    return new Promise(async (resolve, reject) => {
        try {
            const data = await getDialogHistory(sessionId, 'english');
            resolve(data);
        } catch (e) {
            reject();
        }
    });
}