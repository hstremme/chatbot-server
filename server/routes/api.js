import express from "express";
import {translateTextToEnglish, translateTextToGerman} from "../translator.js";
import {answerQueryWithContext} from "../kbOpenAI.js";
import {
    getNamespaces,
    addNamespace,
    deleteNamespace,
    setNamespaceAsSelected,
    storeInfoToDB,
    getInformation,
    deleteInformation,
    createAndUploadEmbeddingFromDbEntry
} from "../dataHandler.js";

const router = express.Router();

// POST Question
router.post('/question', async (req, res) => {
    const knowledgebase = req.query.kbase;
    const question = req.body.question;
    console.log(question);
    switch (knowledgebase){
        case "openAI":
            const questionInEnglish = await translateTextToEnglish(question);
            const answerInEnglish = await answerQueryWithContext(questionInEnglish);
            const answer = await  translateTextToGerman(answerInEnglish);
            res.send(answer)
            break
        default:
            res.send("no KB defined")
            break
    }
    console.log("Selected KB: " + knowledgebase)
})

// GET Namespaces
router.get('/data/namespace', async (req, res) => {
    try {
        const names = await getNamespaces();
        res.send(names);
    } catch (e) {
        res.status(500).send("An error occurred while communicating with the DB: \n" + e);
    }
})

// POST Namespace, adds a given namespace to the db or if param "select": selects given namespace
router.post('/data/namespace', async (req, res) => {
    if (req.query.select){
        try {
            await setNamespaceAsSelected(req.query.select);
            res.status(200).send();
        } catch (e) {
            console.log(e);
            if (e.code == 4004){
                res.status(400).send('Given namespace does not exist!')
            } else {
                res.status(500).send(e);
            }
        }
    } else {
        try {
            await addNamespace(req.body.name);
            res.status(200).send();
        } catch (e) {
            if (e.code == 11000){
                res.status(400).send("Namespace with the given name already exists!");
            } else {
                res.status(500).send("An error occurred while communicating with the DB: \n" + e);
            }
        }
    }
});

// DELETE Namespace
router.delete('/data/namespace', async (req, res) => {
    try {
        await deleteNamespace(req.query.namespace);
        res.send();
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
})

// POST Information
router.post('/data/information', async (req, res) => {
    if (req.body.heading && req.body.content && req.body.namespace){
        try {
            const info = {
                'heading': req.body.heading,
                'content': req.body.content,
                'namespace': req.body.namespace
            };
            await storeInfoToDB(info);
            res.status(200).send();
        } catch (e) {
            console.log(e);
            res.status(500).send('An error occurred while posting new information to DB: \n' + e);
        }
    } else {
        res.status(400).send("Info missing!");
    }
})

// GET Information
router.get('/data/information', async (req, res) => {
    try {
        const info = await getInformation(req.query.namespace);
        res.status(200).send(info);
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
})

// DELETE Information
router.delete('/data/information', async (req, res) => {
    try {
        await deleteInformation(req.query.infoID);
        res.status(200).send();
    } catch (e){
        console.log(e);
        res.status(500).send(e);
    }
})

// POST Embedding
router.post('/data/embedding', async (req, res) => {
    try {
        const response = await createAndUploadEmbeddingFromDbEntry(req.query.infoID);
        res.status(200).send(response);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
})

export { router as api }