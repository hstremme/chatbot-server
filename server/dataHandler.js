import * as fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Information } from './models/information.js';
import { Namespace } from "./models/namespace.js";
import { computeDocEmbedding } from "./kbOpenAI.js";
import { updateSelectedNamespace } from "./config/kbConfig.js";
import axios from "axios";

/**
 * Queries the db for information
 * @param namespace Namespace of the wanted information, if null returns all information in db
 * @returns {Promise<unknown>}
 */
async function getInformation(namespace){
    let filter = null;
    if (namespace){
        filter = {
            namespace: namespace
        }
    }
    return new Promise(async (resolve, reject) => {
        try {
            const res = Information.find(filter, 'infoID heading content namespace hasEmbedding').exec();
            resolve(res);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

/**
 * Saves an Information to the Information-DB
 * @param info a object in the following form:  { 'heading': '...', 'content': '...'}
 * @returns {Promise<void>}
 */
 async function storeInfoToDB(info){
    const infoModel = new Information({
        'infoID': uuidv4(),
        'heading': info.heading,
        'content': info.content,
        'namespace': info.namespace,
        'hasEmbedding': false,
    });
    return new Promise((resolve, reject) => {
        try {
            infoModel.save();
            resolve();
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

/**
 * //TODO update
 * Deletes Information from content database and the associated embedding from vector database
 * @param namespace String representing the namespace which the info belongs to
 * @param infoID ID of the Information
 * @returns {Promise<void>}
 */
async function deleteInformation(infoID){
    return new Promise(async (resolve, reject) => {
        const info = await Information.findOne({'infoID': infoID}).exec();
        // TODO Test ... should work
        if (info.hasEmbedding){
            await deleteEmbeddingFromPinecone(info.namespace, infoID)
                .catch((e) => {
                    reject("An error occurred while trying to delete the embedding. The Information was not deleted!")
                    return;
                });
        }
        const res = await Information.deleteOne({infoID: infoID})
            .catch(async (e) => {
                reject("An error occurred while trying to delete the data. The associated embedding was deleted!");
                await Information.updateOne({infoID: infoID}, {hasEmbedding: false});
                return
            });
        // TODO reject if nothing deleted
        resolve("Information deleted.");
    })
}

async function updateInformation(infoID, changes){
    return new Promise(async (resolve, reject) => {
        try {
            if (changes.heading){
                await Information.updateOne({infoID: infoID}, {heading: changes.heading});
            }
            if (changes.source){
                await Information.updateOne({infoID: infoID}, {source: changes.source})
            }
            if (changes.content){
                await Information.updateOne({infoID: infoID}, {content: changes.content});
                const info = await Information.findOne({infoID: infoID}).exec();
                if (info.hasEmbedding){
                    computeDocEmbedding(info.content)
                        .catch((e) => {
                            console.log(e);
                            reject(e);
                            return;
                        })
                        .then((vector) => {
                            updateEmbedding(info.id, info.namespace, vector);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(e);
                            return;
                        });
                }
            }
            resolve();
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

async function updateEmbedding(id, namespace, vector){
    const url = process.env.PINECONE_URL + '/vectors/update';
    return new Promise(async (resolve, reject) => {
        try {
            const res = await axios.post(url,{
                id,
                values: vector,
                namespace
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': process.env.PINECONE_API_KEY
                }
            });
            resolve(res);
        } catch (e) {
            console.log(e);
            reject(e)
        }
    })
}

async function deleteEmbeddingFromPinecone(namespace, id){
    const url = process.env.PINECONE_URL + '/vectors/delete';
    return new Promise(async (resolve, reject) => {
        try {
            const res = await axios.post(url, {
                "ids": [id],
                namespace
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': process.env.PINECONE_API_KEY
                }
            });
            resolve(res);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

async function deleteAllEmbeddings(namespace){
    const url = process.env.PINECONE_URL + '/vectors/delete';
    axios.post(url, {
        'deleteAll': true,
        namespace
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': process.env.PINECONE_API_KEY
        }
    }).catch((e) => {
        console.log(e);
    })
}

// TODO maybe split single uploads from multiple uploads and extract actual post request
/**
 * Uploads given embeddings to Pinecone vector database using its upsert API
 * @param embeddings array of objects containing the embedding vector and the ID of the information
 * @param namespace String for Namespace where the embeddings will be stored in
 */
async function uploadEmbeddingsToPinecone(embeddings, namespace){
    const url = process.env.PINECONE_URL + '/vectors/upsert';
    const vectors = []
    for (const el of embeddings){
        vectors.push({
            'id': el.infoID,
            'values': el.vector
        });
    }
    return new Promise(async (resolve, reject) => {
        try {
            const res = await axios.post(
                url, {
                    vectors,
                    namespace
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': process.env.PINECONE_API_KEY
                    }
                });
            console.log(res);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

/**
 * Calls Pinecone Fetch endpoint to retrieve embedding vectors for given ids
 * @param namespace String for namespace where vectors will be fetched from
 * @param ids Array of IDs for the vectors as String
 * @returns {Promise<[]>} Object with all found vectors, id as key
 */
async function getEmbedding(namespace, ids){
    const url = PINECONE_URL + '/vectors/fetch';
    var params = new URLSearchParams();
    for (const id of ids){
        params.append('ids', id);
    }
    params.append('namespace', namespace);
    try {
        const res = await axios.get(url, {
            headers: {
                'Api-Key': PINECONE_API_KEY
            },
            params
        });
        return res.data.vectors;
    } catch (e) {
        console.log(e);
    }
}

async function setHasEmbeddingsStatus(infoID, status){
    try {
        const res = await Information.updateOne({infoID}, {hasEmbedding: status});
        return res;
    } catch (e) {
        console.log(e);
    }
}

export async function syncInfoDataWithEmbeddingData(namespace){
    const information = await Information.find({namespace: namespace}).exec();
    for (const info of information){
        if (info.hasEmbedding){
            continue;
        }
        try {
            const vector = await computeDocEmbedding(info.content);
            const embedding = {
                'infoID': info.infoID,
                vector
            };
            await uploadEmbeddingsToPinecone([embedding], namespace);
        } catch (e) {
            console.log(e);
            continue;
        }
        await setHasEmbeddingsStatus(info.infoID, true);
    }
}

async function createEmbeddingAndUpload(infoData, namespace){
    return new Promise(async (resolve, reject) => {
        computeDocEmbedding(infoData.content)
            .catch((e) => {
                return reject("Error: Embedding calculation failed: \n " + e);
            })
            .then((vector) => {
                const embedding = {
                    'infoID': infoData.infoID,
                    vector
                };
                uploadEmbeddingsToPinecone([embedding], namespace);
            })
            .catch((e) => {
                console.log(e);
                return reject("Error: Embedding upload failed: \n" + e);
            })
            .then(() => {
                resolve("Info embedded an uploaded");
            })
    });
}

async function createAndUploadEmbeddingFromDbEntry(infoID){
    return new Promise(async (resolve, reject) => {
        const infoData = await Information.findOne({'infoID': infoID}).exec();
        if (!infoData){
            return reject(`No entry found for given id (${infoID}).`);
        }
        if (infoData.hasEmbedding){
            return resolve('Embedding exists already.');
        }
        createEmbeddingAndUpload(infoData, infoData.namespace)
            .catch((e) => {
                console.log(e);
                return reject(e);
            })
            .then(() => {
                setHasEmbeddingsStatus(infoID, true);
                resolve(`Information (${infoID}) has an uploaded embedding now.`)
            });
    })
}

async function addNamespace(name){
    return new Promise(async (resolve, reject) => {
        try {
            const namespaceModel = new Namespace({
                'value': name,
                'isSelected': false
            });
            await namespaceModel.save();
            resolve();
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

async function deleteNamespace(name){
    return new Promise(async (resolve, reject) => {
        try {
            await Namespace.deleteOne({value: name}).exec();
            await Information.deleteMany({namespace: name}).exec();
            await deleteAllEmbeddings(name);
            resolve();
            //TODO Delete all information and all embeddings
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

async function getNamespaces(){
    return new Promise(async (resolve, reject) => {
        try {
            const res = await Namespace.find(null, 'value isSelected').exec();
            resolve(res);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

async function setNamespaceAsSelected(namespace){
    return new Promise(async (resolve, reject) => {
       const toBeSelected = await Namespace.find({value: namespace}).exec();
       if (toBeSelected.length > 0){
            Namespace.updateOne({isSelected: true}, {isSelected: false}).exec()
                .then(() => {
                    return Namespace.updateOne({value: namespace}, {isSelected: true}).exec();
                })
                .then((res) => {
                    //TODO Think about it, maybe not set it here, but let it be fetched from DB on databaseconfig or if needed(<- probably not, causes to many db calls, just do it ones, but what if it changes?)
                    updateSelectedNamespace();
                    resolve(res);
                })
                .catch((e) => {
                    console.log(e);
                    reject(e);
                })
       } else {
           reject({code: 4004, message: `Error: Namespace "${namespace}" was not found!`})
       }
    })
}

export {
    getNamespaces,
    addNamespace,
    deleteNamespace,
    setNamespaceAsSelected,
    storeInfoToDB,
    getInformation,
    deleteInformation,
    createAndUploadEmbeddingFromDbEntry
}