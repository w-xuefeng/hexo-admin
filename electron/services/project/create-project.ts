import path from 'node:path';
import { app } from 'electron';
import { GLWins } from '../../../shared/global-manager/wins';
import { IPC_CHANNEL } from '../../../shared/dicts/enums';
import { checkPath, createDirectory, directoryIsEmpty } from '../../../shared/service-utils';
import { runScriptBySubProcess } from '../../../shared/service-utils/utility-process';
import R from '../common/r';
import type { ExecuteResult, ICreateProjectOptions } from '../../../shared/utils/types';

function initHexoProject(cwd: string, name: string, onData?: (data: string) => void) {
  return new Promise<ExecuteResult>((resolve) => {
    const scriptName = 'exe';
    const { child, kill } = runScriptBySubProcess(scriptName, {
      options: {
        cwd,
        env: {
          ...process.env,
          COMMAND: `hexo init ${name}`
        }
      }
    });
    child.on('message', ({ type, data }) => {
      if (type === 'data') {
        onData?.(data);
        return;
      }
      if (type === 'result') {
        kill();
        resolve(data);
      }
    });
    child.postMessage(scriptName);
  });
}

export async function createProject(
  winId: string,
  options: ICreateProjectOptions,
  fromEvent?: Electron.IpcMainInvokeEvent
) {
  const projectLocationPathInfo = checkPath(options.path);
  if (!projectLocationPathInfo?.exist) {
    createDirectory(options.path);
  }
  const projectPath = path.join(options.path, options.name);
  const projectPathInfo = checkPath(projectPath);
  if (projectPathInfo?.exist && !directoryIsEmpty(projectPath)) {
    return R.fail('exception.projectPathIsNotEmpty');
  }
  const rs = await initHexoProject(options.path, options.name, (data) => {
    fromEvent?.sender.send(IPC_CHANNEL.CREATE_PROJECT_PROGRESS, data);
  });

  if (rs.error) {
    return R.fail(rs.error);
  }

  fromEvent?.sender.close();

  const mainWin = GLWins.getMainWin(winId);
  mainWin?.win?.webContents.send(IPC_CHANNEL.CHANGE_ROUTER, 'replace', {
    name: 'main-editor',
    query: {
      path: projectPath
    }
  });
  mainWin?.win?.maximize();
  app.addRecentDocument(projectPath);
  return R.success(projectPath);
}
