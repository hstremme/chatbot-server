import axios from "axios";

const url = 'https://api-free.deepl.com/v2/translate';

async function translateText(text, langCode){
    const res = await axios.post(url, null, {
        headers: {
            'Authorization': process.env.DEEPL_API_KEY,
        },
        params : {
            text,
            target_lang: langCode
        }
    }).catch(er => console.log(er));
    return res.data.translations[0].text;
}

export async function translateTextToGerman(text){
    return await translateText(text, "DE");
}

export async function translateTextToEnglish(text){
    return await translateText(text, "EN");
}