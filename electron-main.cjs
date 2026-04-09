const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // No mostrar hasta que esté listo
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      zoomFactor: 1.1 // Aumentar escala un 10% por defecto
    }
  });

  win.maximize(); // Iniciar maximizado para mejor resolución

  win.once('ready-to-show', () => {
    win.show();
  });

  // En producción, cargar el index.html de la carpeta dist
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
