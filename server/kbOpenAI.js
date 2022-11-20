import { Configuration, OpenAIApi} from "openai";
import axios from 'axios';
import { Information } from './models/information.js'
import { encode } from 'gpt-3-encoder'
import { openAiSelectedNamespace } from "./config/kbConfig.js";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration);

// OpenAI model name that will be used for completions
const COMPLETIONS_MODEL = "text-davinci-002";

// OpenAI model name that will be used for embeddings
const EMBEDDINGS_MODEL_NAME = "curie"; //4096
const DOC_EMBDDINGS_MODEL = `text-search-${EMBEDDINGS_MODEL_NAME}-doc-001`;
const QUERY_EMBDDINGS_MODEL = `text-search-${EMBEDDINGS_MODEL_NAME}-query-001`;


/**
 * TODO Update
 * Uses OpenAIs embeddings endpoint to compute embedding vector for given string
 * @param input Input text to get the embedding for
 * @param model ID of the model that will be used to compute the embedding
 * @returns {Promise<Array<number>>} Embedding vector as an Array of floats
 */
async function computeEmbedding(input, model){
    return new Promise(async (resolve, reject) => {
        try{
            const response = await openai.createEmbedding({
                model,
                input
            });
            resolve(response.data.data[0].embedding);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

/**
 * Computes embeddings for the doc (Context) by calling getEmbedding() with predefined Model
 */
export async function computeDocEmbedding(text){
    return await computeEmbedding(text, DOC_EMBDDINGS_MODEL);
}

/**
 * Computes embeddings for the query (Question) by calling getEmbedding() with predefined Model
 */
async function computeQueryEmbedding(text){
    return await computeEmbedding(text, QUERY_EMBDDINGS_MODEL)
}

/**
 * Computes embeddings for an array containing the information
 * @param information Array with the information sections [ {'infoID': '..', 'content': '..' [,...] }, { ... } ]
 * @returns {Promise<*[]>} Array of objects containing the embedding vector of the information and the infoID [ {'vector': [...], 'infoID': '...'}, {...} ]
 */
async function computeDocEmbeddings(information){
    let embeddings = [];
    for (const section of information){
        const vector = await computeDocEmbedding(section.content);
        embeddings.push({
            'infoID': section.infoID,
            vector
        })
    }
    return embeddings;
}

/**
 * Uses Pinecones Query API to retrieve similar vectors for the given embedding vector
 * @param embedding Embedding vector for which similar vectors are searched for
 * @param namespace String for namespace where the query will be executed in
 * @param count Amount of similar vectors that will be returned
 * @returns {Promise<boolean|((selectors: string) => boolean)>} An array of objects containing the matched vectors { id, score, values, metadata}
 */
async function getSimilarEmbeddingsFromPinecone(embedding, namespace, count){
    const url = process.env.PINECONE_URL + '/query';
    const apiKey = process.env.PINECONE_API_KEY;
    try {
        const res = await axios.post(
            url, {
                namespace,
                'topK': count,
                'vector': embedding,
                'includeMetadata': true
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey
                }
            });
        return res.data.matches
    } catch (er){
        console.log(er)
    }
}

async function createContextPrompt(questionEmbedding, namespace, config){
    return new Promise(async (resolve, reject) => {
       try {
           const embeddingsFromPinecone = await getSimilarEmbeddingsFromPinecone(questionEmbedding, namespace, config.similarCount);
           if (embeddingsFromPinecone.length === 0){
               return reject ("No similar Embeddings where found in the given namespace.");
           }
           let chosenInformation = [];
           let chosenInformationLength = 0;
           let chosenInformationHeading = [];
           const separatorLength = encode(config.separator).length;
           for (const el of embeddingsFromPinecone){
               if (el.score < config.similarMinScore){
                   continue;
               }
               const infoRaw = await Information.find({'infoID': el.id, namespace: openAiSelectedNamespace});
               if (infoRaw.length == 0) {
                   continue;
               }
               const info = infoRaw[0];
               chosenInformationLength += encode(info.content).length + separatorLength;
               if (chosenInformationLength > config.maxTokens){
                   break;
               }
               chosenInformation.push(config.separator + info.content.replace("\n", " "));
               chosenInformationHeading.push(info.heading);
           }
           if (chosenInformation.length === 0){
               return reject({'code': 100, 'message': "No context found."})
           }
           resolve({ 'asString': chosenInformation.join(''), 'heading': chosenInformationHeading });
        } catch (e) {
            console.log(e);
            reject({'code': 200, 'message': e });
       }
    });
}

/**
 * Calls the openAI completions endpoint to answer the given question with context that will be computed
 * @param query The question string that will be answered
 * @param showPrompt
 * @returns {Promise<string>} Returns the answer as a string
 */
export async function answerQueryWithContext(query, showPrompt=false){
    const config = {
        'similarCount': 10,
        'similarMinScore': 0.3,
        'separator': '\n*',
        'maxTokens': 500
    }
    return new Promise(async (resolve, reject) => {
        try {
            const queryEmbedding = await computeQueryEmbedding(query);
            const context = await createContextPrompt(queryEmbedding, openAiSelectedNamespace, config);
            const headerString =
                'Answer the question as truthfully as possible using the provided context, and if the answer is not contained within the text below, say "I don\'t know." \n\n Context: \n';
            const prompt = headerString + context.asString + '\n\n Q: ' + query + '\n A:';
            const response = await openai.createCompletion({
                model: COMPLETIONS_MODEL,
                prompt,
                max_tokens: 300,
                temperature: 0.0
            });
            resolve(response.data.choices[0].text);
        } catch (e) {
            if (e.code && e.code === 100){
                resolve("There is no context.");
            } else {
                reject(e);
            }
        }
    });
}