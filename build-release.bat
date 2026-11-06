@echo off
title Aegis Hub - Build & Release Manager
cd /d "%~dp0"

for /f "tokens=*" %%v in ('node -e "const d=new Date(); const pad=(n)=>String(n).padStart(2,'0'); console.log('b'+pad(d.getDate())+pad(d.getMonth()+1)+d.getFullYear());"') do set BUILD_VER=%%v

:menu
cls
echo ========================================================
echo              AEGIS HUB - BUILD ^& RELEASE MANAGER
echo                   Versao: %BUILD_VER%
echo ========================================================
echo.
echo  --- BUILD LOCAL (Sem enviar para a Internet) ---
echo   [1] Local: Instalador Windows (.exe Setup)
echo   [2] Local: Versao Portable (.exe autonomo)
echo   [3] Local: Ambos (Instalador + Portable)
echo.
echo  --- PUBLICAR NO GITHUB (Cria Release e Atualiza a App) ---
echo   [4] Publicar no GitHub: Instalador Windows (.exe)
echo   [5] Publicar no GitHub: Ambos (Instalador + Portable)
echo.
echo   [6] Sair
echo ========================================================
echo.
set /p opt="Escolha uma opcao [1-6] e pressione Enter: "

if "%opt%"=="1" goto local_installer
if "%opt%"=="2" goto local_portable
if "%opt%"=="3" goto local_both
if "%opt%"=="4" goto release_installer
if "%opt%"=="5" goto release_both
if "%opt%"=="6" goto exit

echo.
echo [!] Opcao invalida. Tente novamente.
timeout /t 2 >nul
goto menu

:local_installer
cls
echo A compilar Instalador localmente...
call npm run dist:installer
goto done

:local_portable
cls
echo A compilar Versao Portable localmente...
call npm run dist:portable
goto done

:local_both
cls
echo A compilar Ambos localmente...
node scripts/run-build.cjs --win nsis --win portable
goto done

:release_installer
cls
echo A compilar e PUBLICAR Instalador no GitHub...
call npm run release:installer
goto done

:release_both
cls
echo A compilar e PUBLICAR Ambos no GitHub...
node scripts/run-build.cjs --win nsis --win portable --publish
goto done

:done
echo.
if %errorlevel% equ 0 (
  echo ========================================================
  echo [SUCESSO] Operacao concluida com sucesso!
  echo Os ficheiros estao disponiveis na pasta: release\
  echo ========================================================
  echo.
  if exist "release" (
    start "" "release"
  )
) else (
  echo ========================================================
  echo [ERRO] Ocorreu um problema durante a operacao.
  echo Codigo de erro: %errorlevel%
  echo ========================================================
)
echo.
pause
exit /b

:exit
echo Operacao cancelada.
exit /b
