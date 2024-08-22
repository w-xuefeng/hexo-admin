import Store from 'electron-store';
import path from 'node:path';
import initIPCStoreEvent from '../store';
import importProject from '../services/project/import-project';
import { dialog, ipcMain, nativeTheme, type OpenDialogOptions } from 'electron';
import { IPC_CHANNEL } from '../../shared/dicts/enums';
import { checkEnv, getEnvPath } from '../../shared/service-utils';
import { createProject } from '../services/project/create-project';
import { createIndependentWindow } from '../window/independent-win';
import { GLIPCEventHandled } from '../../shared/global-manager/vars';
import { GLWins } from '../../shared/global-manager/wins';
import { type ICreateProjectOptions } from '../../shared/utils/types';

export default function initIPCEvent(store: Store) {
  if (GLIPCEventHandled.current) {
    return;
  }

  initIPCStoreEvent(store);

  ipcMain.handle(IPC_CHANNEL.CHANGE_THEME, (_, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme;
  });

  ipcMain.handle(IPC_CHANNEL.CHECK_ENV, (_, envPath?: string) => {
    return checkEnv(envPath);
  });

  ipcMain.on(IPC_CHANNEL.CHECK_ENV, async (_, envPath?: string) => {
    const rs = await checkEnv(envPath);
    GLWins.mainWin?.webContents?.send(IPC_CHANNEL.CHECK_ENV_FROM_OTHERS_PAGE, rs);
  });

  ipcMain.handle(IPC_CHANNEL.GET_ENV_PATH, () => {
    return getEnvPath();
  });

  ipcMain.handle(IPC_CHANNEL.CHOOSE_DIRECTORY, async (_, options: Partial<OpenDialogOptions>) => {
    const rs = await dialog.showOpenDialog({
      ...options,
      properties: ['openDirectory', ...(options?.properties ?? [])]
    });
    Reflect.set(rs, 'sep', path.sep);
    return rs;
  });

  ipcMain.handle(IPC_CHANNEL.CHOOSE_FILE, async (_, options: Partial<OpenDialogOptions>) => {
    const rs = await dialog.showOpenDialog({
      ...options,
      properties: ['openFile', ...(options?.properties ?? [])]
    });
    Reflect.set(rs, 'sep', path.sep);
    return rs;
  });

  ipcMain.handle(IPC_CHANNEL.IMPORT_PROJECT, (_, options: Partial<OpenDialogOptions>) => {
    return importProject(options);
  });

  ipcMain.handle(
    IPC_CHANNEL.OPEN_INDEPENDENT_WINDOW,
    (_, routePath: string, options?: Partial<Electron.BrowserWindowConstructorOptions>) => {
      return createIndependentWindow(routePath, options);
    }
  );

  ipcMain.handle(IPC_CHANNEL.CLOSE_WINDOW, (event) => {
    event.sender.close();
  });

  ipcMain.handle(IPC_CHANNEL.CREATE_PROJECT, (event, options: ICreateProjectOptions) => {
    return createProject(options, event);
  });

  GLIPCEventHandled.current = true;
}
