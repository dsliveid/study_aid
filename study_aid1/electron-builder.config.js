/**
 * Electron Builder Configuration
 * 用于配置应用的打包和分发
 */

module.exports = {
  // 应用基本信息
  appId: 'com.studyaid.app',
  productName: '桌面学习助手',
  copyright: 'Copyright © 2024 Study Aid Team',

  // 构建目录
  directories: {
    output: 'release',
    buildResources: 'resources'
  },

  // 需要打包的文件
  files: [
    'out/**/*',
    'package.json'
  ],

  // 额外资源文件
  extraResources: [
    {
      from: 'resources/icons',
      to: 'icons',
      filter: ['**/*']
    }
  ],

  // 文件关联
  fileAssociations: [
    {
      ext: 'pdf',
      name: 'PDF Document',
      description: 'PDF文档',
      role: 'Viewer',
      icon: 'resources/icons/pdf.ico'
    },
    {
      ext: 'docx',
      name: 'Word Document',
      description: 'Word文档',
      role: 'Viewer',
      icon: 'resources/icons/docx.ico'
    },
    {
      ext: 'txt',
      name: 'Text Document',
      description: '文本文档',
      role: 'Viewer',
      icon: 'resources/icons/txt.ico'
    }
  ],

  // Windows 配置
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'resources/icons/icon.ico',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    // 代码签名配置（需要证书）
    // signingHashAlgorithms: ['sha256'],
    // certificateFile: process.env.WIN_CSC_LINK,
    // certificatePassword: process.env.WIN_CSC_KEY_PASSWORD
  },

  // NSIS 安装程序配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '桌面学习助手',
    perMachine: false,
    language: '2052',

    // 安装程序界面
    installerIcon: 'resources/icons/install.ico',
    uninstallerIcon: 'resources/icons/uninstall.ico',
    installerHeader: 'resources/icons/header.bmp',
    installerSidebar: 'resources/icons/sidebar.bmp',

    // 完成后运行
    runAfterFinish: true,

    // 许可协议
    license: 'LICENSE.txt',

    // 自定义安装脚本
    include: 'resources/installer.nsh'
  },

  // macOS 配置
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64', 'universal']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64', 'universal']
      }
    ],
    icon: 'resources/icons/icon.icns',
    category: 'public.app-category.education',
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    gatekeeperAssess: false,
    hardenedRuntime: true,
    // 代码签名配置（需要证书）
    // identity: process.env.MAC_IDENTITY
  },

  // DMG 配置
  dmg: {
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 380
    },
    background: 'resources/icons/dmg-background.png',
    icon: 'resources/icons/icon.icns'
  },

  // Linux 配置
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64']
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'resources/icons',
    category: 'Education',
    maintainer: 'Study Aid Team',
    vendor: 'Study Aid',
    synopsis: '桌面学习助手 - 帮助用户高效学习',
    description: '一款功能强大的桌面学习助手，支持语音识别、截图标注、文档解析和AI内容生成等功能。'
  },

  // 发布配置（用于自动更新）
  publish: [
    {
      provider: 'github',
      owner: 'your-username',
      repo: 'study-aid'
    }
  ],

  // 打包前忽略的文件
  asar: true,
  asarUnpack: [
    'resources/**/*',
    'node_modules/**/*.node'
  ],

  // 依赖项
  dependencies: [
    'axios',
    'bufferutil',
    'element-plus',
    'mammoth',
    'pdfjs-dist',
    'pinia',
    'sql.js',
    'utf-8-validate',
    'vue',
    'vue-router',
    '@tiptap/**'
  ],

  // 不需要的依赖
  excludeDevDependencies: true,

  // 额外的元数据
  metadata: {
    name: 'study-aid',
    version: '1.0.0',
    description: '桌面学习助手 - Desktop Learning Assistant'
  }
}
