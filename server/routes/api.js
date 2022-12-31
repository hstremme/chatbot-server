import express from "express";
import {addDialog, getDialogHistoryGerman} from "../sessionHandler.js";
import KbAzure from "../kbAzure.js";

const router = express.Router();

// POST Question
router.post('/question', async (req, res) => {
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
                answer.prompts);
        }
    } catch (e){
        if (e.code === 1){
            res.sendStatus(208);
        } else {
            console.log(e);
            res.sendStatus(500);
        }
    }
})

// GET Dialog
router.get('/session/dialog', async (req, res) => {
    try {
        const data = await getDialogHistoryGerman(req.query.sessionId);
        res.send(data);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
})

export { router as api }