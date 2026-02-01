const WebSocketServer = require('./api/websocket');
const config = require('./config');

console.log('=================================');
console.log('实时语音识别 - 后端服务');
console.log('=================================');

if (!config.xunfei.appId || !config.xunfei.accessKeyId || !config.xunfei.accessKeySecret) {
  console.error('错误：请配置科大讯飞API密钥');
  console.error('请设置环境变量：');
  console.error('  XUNFEI_APP_ID');
  console.error('  XUNFEI_API_KEY');
  console.error('  XUNFEI_API_SECRET');
  console.error('=================================');
  process.exit(1);
}

const server = new WebSocketServer({
  port: config.server.port,
  xunfei: {
    url: config.xunfei.url,
    appId: config.xunfei.appId,
    accessKeyId: config.xunfei.accessKeyId,
    accessKeySecret: config.xunfei.accessKeySecret
  }
});

server.start();

process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  server.stop();
  process.exit(0);
});
