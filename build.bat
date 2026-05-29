@echo off
chcp 65001 >nul
title DTP Ocenka — Build

echo.
echo ╔══════════════════════════════════════╗
echo ║     DTP Ocenka — Build jarayoni      ║
echo ╚══════════════════════════════════════╝
echo.

:: Node.js tekshirish
node --version >nul 2>&1
if errorlevel 1 (
    echo [XATO] Node.js topilmadi!
    echo https://nodejs.org dan yuklab o'rnating
    pause
    exit /b 1
)

echo [1/4] Node.js topildi ✓
node --version

:: node_modules tozalash
if exist node_modules (
    echo.
    echo [2/4] Eski node_modules o'chirilmoqda...
    rmdir /s /q node_modules
)

:: npm install
echo.
echo [3/4] Kutubxonalar o'rnatilmoqda...
echo      (birinchi marta 5-10 daqiqa ketishi mumkin)
echo.
npm install --ignore-scripts
if errorlevel 1 (
    echo.
    echo [XATO] npm install muvaffaqiyatsiz!
    pause
    exit /b 1
)

:: Electron alohida o'rnatish (to'liq yuklanishi uchun)
echo.
echo [3.5/4] Electron yuklanmoqda...
npm install electron@28.3.3
if errorlevel 1 (
    echo [XATO] Electron o'rnatilmadi!
    pause
    exit /b 1
)

:: Build
echo.
echo [4/4] .exe fayl yaratilmoqda...
echo.
npx electron-builder --win --x64
if errorlevel 1 (
    echo.
    echo [XATO] Build muvaffaqiyatsiz!
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════╗
echo ║         BUILD MUVAFFAQIYATLI!        ║
echo ║                                      ║
echo ║  dist\ papkasini oching:             ║
echo ║  - DTP_Ocenka_Setup_v3.exe           ║
echo ║  - DTP_Ocenka_Portable_v3.exe        ║
echo ╚══════════════════════════════════════╝
echo.

:: dist papkasini ochish
start "" explorer "%~dp0dist"
pause
