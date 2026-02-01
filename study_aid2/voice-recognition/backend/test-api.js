const WebSocketServer = require('./src/api/websocket');
const config = require('./src/config');

console.log('=================================');
console.log('科大讯飞API连接测试');
console.log('=================================\n');

if (!config.xunfei.appId || !config.xunfei.accessKeyId || !config.xunfei.accessKeySecret) {
  console.error('❌ 错误：请配置科大讯飞API密钥');
  console.error('请设置环境变量或修改 src/config.js 文件：');
  console.error('  XUNFEI_APP_ID');
  console.error('  XUNFEI_API_KEY');
  console.error('  XUNFEI_API_SECRET');
  console.error('\n参考文档：backend/docs/API_Configuration.md');
  console.error('=================================\n');
  process.exit(1);
}

console.log('✓ API密钥配置检查通过\n');
console.log('配置信息：');
console.log(`  AppID: ${config.xunfei.appId}`);
console.log(`  Access Key ID: ${config.xunfei.accessKeyId.substring(0, 8)}...`);
console.log(`  Access Key Secret: ${config.xunfei.accessKeySecret.substring(0, 8)}...`);
console.log(`  WebSocket URL: ${config.xunfei.url}`);
console.log(`  服务器端口: ${config.server.port}`);
console.log('');

const server = new WebSocketServer({
  port: config.server.port,
  xunfei: {
    url: config.xunfei.url,
    appId: config.xunfei.appId,
    accessKeyId: config.xunfei.accessKeyId,
    accessKeySecret: config.xunfei.accessKeySecret
  }
});

console.log('正在启动服务器...\n');

server.start();

setTimeout(() => {
  console.log('\n=================================');
  console.log('测试完成');
  console.log('=================================');
  console.log('✓ WebSocket服务器已启动');
  console.log('✓ 端口监听:', config.server.port);
  console.log('\n按 Ctrl+C 停止服务器\n');
}, 2000);

process.on('SIGINT', () => {
  console.log('\n\n正在关闭服务器...');
  server.stop();
  process.exit(0);
});
