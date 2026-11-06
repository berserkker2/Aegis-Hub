@echo off
title Aegis Hub Launcher
echo Starting Aegis Hub...
npm run dev
if %errorlevel% neq 0 (
  echo.
  echo [Aegis Hub] A aplicacao encerrou com o codigo %errorlevel%.
  pause
)