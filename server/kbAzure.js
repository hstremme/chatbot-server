import axios from "axios";

class KbAzure{

    static params = {
        'projectName': 'kb-bot-test',
        'api-version': '2021-10-01',
        'deploymentName': 'production'
    }

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
                    },
                    params: this.params
                });
                const firstAnswer = res.data.answers[0];
                const data = {
                    'answer': firstAnswer.answer,
                    'prompts': firstAnswer.dialog.prompts
                }
                resolve(data);
            } catch (e) {
                console.log(e);
                reject();
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
                    params: this.params
                });
                const firstAnswer = res.data.answers[0];
                const data = {
                    'answer': firstAnswer.answer,
                    'question': firstAnswer.questions[0]
                }
                resolve (data);
            } catch (e) {
                console.log(e);
                reject();
            }
        })
    }
}

export default KbAzure;