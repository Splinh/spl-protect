const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Cấu hình thư mục chứa dữ liệu người dùng ngay tại thư mục dự án
// Tránh lỗi phân quyền "Access is denied (0x5)" trong AppData\Roaming
const userDataPath = path.join(app.getAppPath(), 'userdata');
if (!fs.existsSync(userDataPath)) {
  try {
    fs.mkdirSync(userDataPath, { recursive: true });
  } catch (err) {
    console.error('Failed to create userdata directory:', err);
  }
}
app.setPath('userData', userDataPath);


function createWindow() {
  const win = new BrowserWindow({
    width: 950,
    height: 720,
    resizable: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'SPL Protect — Windows Security Auditor',
    autoHideMenuBar: true
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Audit
ipcMain.handle('run-audit', async () => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'scripts', 'audit.ps1');
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Audit execution error:', error);
        return resolve({ success: false, error: stderr || error.message });
      }
      try {
        const data = JSON.parse(stdout.trim());
        resolve({ success: true, data });
      } catch (e) {
        console.error('Failed to parse audit JSON output:', stdout);
        resolve({ success: false, error: 'Malformed output from audit script: ' + stdout });
      }
    });
  });
});

// IPC Handler for Optimize
ipcMain.handle('run-optimize', async (event, action) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'scripts', 'optimize.ps1');
    const tempResultPath = path.join(__dirname, 'scripts', 'opt_result.json');
    
    // Clean up old temp file if it exists
    if (fs.existsSync(tempResultPath)) {
      try { fs.unlinkSync(tempResultPath); } catch (err) {}
    }

    // PowerShell wrapper to elevate and output to temp JSON file
    // Out-File -Encoding utf8 is used to ensure JSON formatting is preserved correctly.
    // -WindowStyle Hidden is used to run the elevated window in the background (UAC prompt will still show).
    const psCommand = `Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Action "${action}" -ResultPath "${tempResultPath}"' -Verb RunAs -WindowStyle Hidden -Wait`;

    const runCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`;

    exec(runCommand, (error, stdout, stderr) => {
      // Check if file was written. If yes, it ran successfully.
      setTimeout(() => {
        if (fs.existsSync(tempResultPath)) {
          try {
            const fileContent = fs.readFileSync(tempResultPath, 'utf8');
            // Remove BOM if present (Out-File in powershell often adds BOM)
            const cleanContent = fileContent.replace(/^\uFEFF/, '').trim();
            const data = JSON.parse(cleanContent);
            
            // Clean up temp file
            fs.unlinkSync(tempResultPath);
            resolve({ success: true, data });
          } catch (e) {
            resolve({ success: false, error: 'Không thể phân tích dữ liệu log: ' + e.message });
          }
        } else {
          // If file does not exist, either user denied UAC or script failed
          resolve({ success: false, error: 'Quyền Administrator bị từ chối hoặc tiến trình tối ưu hóa bị hủy.' });
        }
      }, 800); // Small delay to ensure file write completed and file lock is released
    });
  });
});
