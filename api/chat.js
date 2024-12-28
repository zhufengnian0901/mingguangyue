const axios = require('axios');
const crypto = require('crypto');

// API密钥配置
const API_KEY = '97e7282de80ceb71';
const API_SECRET = 'c18d4a2381adf821c5e8c03eabcdcf91';

// 生成JWT Token
function generateToken() {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = {
        "alg": "HS256",
        "sign_type": "SIGN"
    };
    
    const payload = {
        "api_key": API_KEY,
        "exp": timestamp + 3600,
        "timestamp": timestamp
    };

    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
        .createHmac('sha256', API_SECRET)
        .update(`${headerBase64}.${payloadBase64}`)
        .digest('base64url');

    return `${headerBase64}.${payloadBase64}.${signature}`;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '方法不允许' });
    }

    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: '消息不能为空' });
        }

        const token = generateToken();

        const requestData = {
            model: "chatglm_turbo",
            messages: [{
                role: "user",
                content: message
            }],
            stream: true
        };

        const response = await axios({
            method: 'post',
            url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            data: requestData,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
                'Accept': 'text/event-stream'
            },
            responseType: 'stream'
        });

        // 设置SSE响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 转发AI响应
        response.data.on('data', chunk => {
            res.write(chunk);
        });

        response.data.on('end', () => {
            res.end();
        });

    } catch (error) {
        console.error('AI服务错误:', error.response?.data || error.message);
        res.status(500).json({
            error: '服务器错误',
            message: error.response?.data?.error?.message || error.message
        });
    }
}; 