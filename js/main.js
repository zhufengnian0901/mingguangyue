const { createApp } = Vue

createApp({
    data() {
        return {
            personalInfo: {
                name: "明广跃",
                avatar: "imgs/avatar.jpg",
                bio: "我是有对象的明广跃，这是我的恋爱网站",
                infoImages: [
                    { 
                        url: "imgs/img1.jpg", 
                        title: "图片1标题",
                        description: "这是第一张图片的详细介绍。可以描述图片的背景故事、拍摄时间地点，或者相关的个人经历等。",
                        position: "left"
                    },
                    { 
                        url: "imgs/img2.jpg", 
                        title: "图片2标题",
                        description: "这是第二张图片的详细介绍。内容可以包括项目经历、获得的成果，或者其他想要分享的故事。",
                        position: "right"
                    },
                    { 
                        url: "imgs/img3.jpg", 
                        title: "图片3标题",
                        description: "这是第三张图片的详细介绍。可以是个人爱好、特长展示，或者其他想要表达的内容。",
                        position: "left"
                    }
                ]
            },
            slides: [
                { 
                    url: 'imgs/img5.jpg', 
                    description: '我们的照片' 
                }
            ],
            currentSlide: 0,
            showMessageModal: false,
            userInput: '',
            isTyping: false,
            error: null,
            successMessage: null,
            socialLinks: [
                {
                    name: '微信',
                    url: '#',
                    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v3/icons/wechat.svg'
                },
                {
                    name: '抖音',
                    url: 'https://www.douyin.com/user/MS4wLjABAAAA2yNKzYn2mB9KxzJBghVMIUIfK-8lSLtR3eaKYF2DaKo?from_tab_name=main',
                    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v3/icons/tiktok.svg'
                }
            ],
            showWechatQR: false,
            showChatModal: false,
            chatMessages: []
        }
    },
    methods: {
        prevSlide() {
            this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        },
        nextSlide() {
            this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        },
        setSlide(index) {
            this.currentSlide = index;
        },
        async callZhipuAI(message) {
            try {
                const API_URL = 'https://mingguangyue.vercel.app/api/chat';

                console.log('发送消息到服务器:', message);
                
                let retries = 3;
                let response;
                
                while (retries > 0) {
                    try {
                        response = await fetch(API_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'text/event-stream'
                            },
                            body: JSON.stringify({ message })
                        });
                        break;
                    } catch (e) {
                        retries--;
                        if (retries === 0) throw e;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (!response.ok) {
                    const error = await response.json();
                    console.error('服务器响应错误:', error);
                    throw new Error(error.message || '请求失败');
                }

                const reader = response.body.getReader();
                let aiResponse = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = new TextDecoder().decode(value);
                    console.log('收到服务器响应:', text);

                    const lines = text.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            try {
                                const data = JSON.parse(line.slice(5));
                                if (data.data) {
                                    aiResponse += data.data;
                                    this.updateAIMessage(aiResponse);
                                }
                            } catch (e) {
                                console.error('解析响应数据错误:', e, line);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('AI 调用错误:', error);
                this.handleError(error);
            }
        },
        updateAIMessage(content) {
            if (this.chatMessages.length > 0 && 
                this.chatMessages[this.chatMessages.length - 1].type === 'ai') {
                this.chatMessages[this.chatMessages.length - 1].content = content;
            } else {
                this.chatMessages.push({
                    type: 'ai',
                    content: content
                });
            }
        },
        handleError(error) {
            const errorMessage = error.message || '抱歉，我现在无法回答，请稍后再试。';
            this.chatMessages.push({
                type: 'ai',
                content: errorMessage
            });
            this.error = errorMessage;
            setTimeout(() => {
                this.error = null;
            }, 3000);
        },
        async sendMessage(event) {
            if (event.type === 'keyup' && event.shiftKey) return;
            
            const message = this.userInput.trim();
            if (!message || this.isTyping) return;

            this.isTyping = true;
            const currentMessage = message;
            this.userInput = '';
            
            this.showChatModal = true;
            
            this.chatMessages.push({
                type: 'user',
                content: currentMessage
            });

            try {
                await this.callZhipuAI(currentMessage);
            } finally {
                this.isTyping = false;
                this.$nextTick(() => {
                    if (this.$refs.chatMessages) {
                        this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight;
                    }
                });
            }
        },
        handleWechatClick() {
            this.showWechatQR = true;
        },
        handleSocialClick(social) {
            if (social.url === '#') {
                this.handleWechatClick();
            } else {
                window.open(social.url, '_blank');
            }
        }
    },
    mounted() {
        setInterval(this.nextSlide, 7000);
    }
}).mount('#app') 