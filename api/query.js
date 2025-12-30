import axios from "axios";

const ajax = axios.create({});

export default async function query(configs){
    const [config, ...otherConfigs] = configs;
    if(!config) return {
        code: 500,
        message: "Not Found"
    };
    try {
        const response = await ajax(config);
        response.__fetchMeta = {
            url: config.url,
            method: config.method,
        };
        return response;
    } catch (error) {
        return query(otherConfigs)
    }
}