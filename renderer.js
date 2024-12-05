const {ipcRenderer} = require('electron')

window.addEventListener('DOMContentLoaded', () => {
    const but = document.getElementById('but')
    but.addEventListener('click', () => {
        ipcRenderer.send('print-document', {
            htmlContent: '<html><div>哈哈哈</div></html>',
            printOptions: {
              silent: true, // 是否静默打印，设置为 true 时不会显示打印对话框
              printBackground: true, // 是否打印背景图形和颜色
              deviceName: 'Microsoft Print to PDF', // 指定打印设备名称，这里使用的是 PDF 打印机
              pageSize: 'A4', // 设置页面大小为 A4
              marginType: 1, // 设置边距类型，1 表示使用默认边距
              landscape: true, // 是否以横向模式打印，设置为 true 则为横向
              scale: 1, // 设置缩放比例，1 表示不缩放
              fitToPage: true, // 是否将内容适应页面大小
              background: true // 是否打印背景图形和颜色
            }
          })
    })
})