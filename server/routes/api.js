import express from "express";
import {addDialog, getDialogHistoryGerman} from "../sessionHandler.js";
import KbAzure from "../kbAzure.js";

const router = express.Router();

// POST Question
router.post('/question', async (req, res) => {
    const knowledgebase = req.query.kbase;
    const question = req.body.question;
    switch (knowledgebase){
        case "azure":
            try {
                let answer
                if (req.body.qnaId){
                    answer = await KbAzure.getQuestionPairById(req.body.qnaId);
                    res.send(answer);
                } else {
                    answer = await KbAzure.getAnswer(req.body.question);
                    res.send(answer);
                    await addDialog(
                        {question: req.body.question, answer: answer.answer},
                        {question: req.body.question, answer: answer.answer},
                        req.body.sessionId,
                        req.body.dialogCount,
                        answer.prompts,
                        false);
                }
            } catch (e){
                if (e.code === 1){
                    res.sendStatus(208);
                    await addDialog(
                        {question: req.body.question, answer: "Es wurde keine passende Antwort gefunden."},
                        {question: req.body.question, answer: "Es wurde keine passende Antwort gefunden."},
                        req.body.sessionId,
                        req.body.dialogCount,
                        null,
                        true);
                } else {
                    console.log(e);
                    res.sendStatus(500);
                }
            }
            break
        default:
            res.send("no KB defined")
            break
    }
})

export { router as api }