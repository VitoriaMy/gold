
export const summary = [
    {
        url: "https://www.huilvbiao.com/api/gold_indexApi",
        method: "get",
        responseType: "text",
        transformResponse: [(res) => {
            const keys = [
                'now', '', '', '', 'max', 'min', 'time', 'close', 'open', '', '', '', 'date', 'title'
            ]
            const [
                autd, gc, xau
            ] = (res || '').split("\n").map(i => {
                const values = (i.split(`"`)[1] || '').split(",");
                return Object.fromEntries(keys.map((key, index) => [key, values[index]]).filter(i => i[0]))
            })
            return {
                autd,
                gc,
                xau,
            }

        }]
    }
]

export const today = [
    {
        url: "https://www.huilvbiao.com/api/gold?d=1d",
        method: "get",
        responseType: "text",
        transformRequest: [],
        transformResponse: [(res) => {
            return JSON.parse(res)
        }]
    }
]

export const month = [
    {
        url: "https://www.huilvbiao.com/api/gold?d=30d",
        method: "get",
        responseType: "json",
        transformRequest: [],
        transformResponse: [(res) => {
            return JSON.parse(res)
        }]
    }
]