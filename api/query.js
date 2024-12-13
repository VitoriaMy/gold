import axios from "axios";

const ajax = axios.create({});

export default async function query(configs){
    const [config, ...otherConfigs] = configs;
    if(!config) return {
        code: 500,
        message: "Not Found"
    };
    try {
        return await ajax(config)
    } catch (error) {
        return query(otherConfigs)
    }
}