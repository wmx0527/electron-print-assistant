// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const WebSocket = require('ws')
const path = require('node:path')

const WEBSOCKET_PORT = 10086

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, './public/icons/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      sandbox: false,
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })
  
  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // 创建 WebSocket 服务器
  const wss = createWebSocketServer()
  // 窗口关闭时清理 WebSocket 服务器
  mainWindow.on('closed', () => {
    wss.close(() => {
      console.log('WebSocket 服务器已关闭')
    })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  // 设置开机自启动
  app.setLoginItemSettings({
    openAtLogin: true, // 设置为 true 以启用开机自启动
    path: app.getPath('exe') // 获取应用程序的可执行文件路径
  })

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 提取打印功能为独立函数
function handlePrinting(htmlContent, printOptions) {
  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({ show: false })

    // 加载一个空的 HTML 页面
    printWindow.loadFile('print.html', { query: { content: htmlContent } })

    const defaultPrintOptions = {
      silent: true,
      deviceName: 'Microsoft Print to PDF',
      margins: {
        marginType: 'custom', // 使用自定义边距
        top: 10, // 上边距
        bottom: 10, // 下边距
        left: 0, // 左边距
        right: 10 // 右边距
      },
      ...printOptions  // 使用传入的选项覆盖默认选项
    }

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print(defaultPrintOptions, (success, errorType) => {
        if (!success) {
          console.error('打印失败:', errorType)
          reject(errorType)
        } else {
          resolve(success)
        }
        printWindow.close()
      })
    })

    printWindow.webContents.on('crashed', (e) => {
      console.error('打印窗口崩溃:', e)
      reject(new Error('打印窗口崩溃'))
      printWindow.close()
    })
  })
}

// IPC 打印处理
ipcMain.on('print-document', async (event, data) => {
  try {
    const { htmlContent, printOptions } = data
    await handlePrinting(htmlContent, printOptions)
    event.reply('print-complete', { success: true })
  } catch (error) {
    console.error('打印失败:', error)
    event.reply('print-complete', { success: false, error: error.message })
  }
})

// WebSocket 服务器创建和消息处理
function createWebSocketServer() {
  const wss = new WebSocket.Server({ port: WEBSOCKET_PORT })

  wss.on('error', (error) => {
    console.error('WebSocket 服务器错误:', error)
  })

  wss.on('connection', function connection(ws) {
    console.log('新客户端已连接')

    // 获取打印机列表并发送给客户端
    const printWindow = new BrowserWindow({ show: false })
    printWindow.webContents.on('did-finish-load', async () => {
      const printers = await printWindow.webContents.getPrintersAsync()
      ws.send(JSON.stringify({
        type: 'printer-list',
        message: '获取打印机列表成功',
        data: printers
      }))
      printWindow.close()
    })
    printWindow.loadURL('about:blank') // 加载一个空页面以初始化 webContents

    ws.on('message', async function incoming(message) {
      try {
        const parsedMessage = JSON.parse(message);
        const printResult = await handlePrinting(parsedMessage.htmlContent, parsedMessage.printOptions)
        ws.send(JSON.stringify({
          type: 'success',
          message: '打印成功',
          data: printResult
        }))
      } catch (error) {
        console.error('消息解析失败:', error);
      }
    });

    ws.on('error', function error(error) {
      console.error('WebSocket 错误:', error)
    })

    ws.on('close', function close() {
      console.log('客户端连接已关闭')
    })
  })

  return wss
}