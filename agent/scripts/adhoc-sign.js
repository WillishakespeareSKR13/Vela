'use strict';

const { execSync } = require('child_process');
const path = require('path');

/**
 * afterPack de electron-builder: sin Developer ID no se firma con identidad,
 * pero en Apple Silicon un binario SIN firma alguna no arranca («Killed: 9» o
 * «esta danado»). La firma ad-hoc (`--sign -`) no evita el aviso de Gatekeeper
 * —clic derecho → Abrir la primera vez— pero si que la app se ejecute y que
 * macOS recuerde los permisos concedidos entre arranques. Con CSC_NAME o
 * mac.identity definidos electron-builder firma de verdad y esto no hace nada.
 */
exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.CSC_NAME || process.env.CSC_LINK) return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
  console.log(`  • firma ad-hoc aplicada  ${path.basename(appPath)}`);
};
