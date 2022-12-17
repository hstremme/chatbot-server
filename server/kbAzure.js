import axios from "axios";
import {Source} from "./models/source.js";
import {confidenceMin} from "./config/kbConfig.js";

class KbAzure{

    static url = process.env.AZURE_URL;
    static key = process.env.AZURE_KEY;

    static async getAnswer(question){
        return new Promise(async (resolve, reject) => {
            try {
                const res = await axios.post(this.url,{
                    question
                },{
                    headers:{
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': this.key
                    }
                });
                const firstAnswer = res.data.answers[0];
                if (firstAnswer.confidenceScore < confidenceMin){
                    return reject({code: 1, message: 'No fitting answer found.'})
                }
                const source = await getSourceByAbbreviation(firstAnswer.metadata.source);
                const data = {
                    'answer': firstAnswer.answer,
                    'prompts': firstAnswer.dialog.prompts,
                    source
                }
                resolve(data);
            } catch (e) {
                console.log(e);
                reject({code: 2, message: 'Error: ' + e});
            }
        })
    }

    static async getQuestionPairById(id){
        console.log(id);
        return new Promise(async  (resolve, reject) => {
            try {
                const res = await axios.post(this.url,{
                    'qnaId': id,
                }, {
                    headers:{
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': this.key
                    },
                });
                const firstAnswer = res.data.answers[0];
                const source = await getSourceByAbbreviation(firstAnswer.metadata.source);
                const data = {
                    'answer': firstAnswer.answer,
                    'question': firstAnswer.questions[0],
                    source
                }
                resolve (data);
            } catch (e) {
                console.log(e);
                reject();
            }
        })
    }
}

async function getSourceByAbbreviation(abr){
    return new Promise(async (resolve, reject) => {
        try {
            const res = await Source.findOne({abbreviation: abr}, "-_id link_text link_url").exec();
            resolve(res);
        } catch (e) {
            console.log(e);
            reject();
        }
    });
}

export default KbAzure;