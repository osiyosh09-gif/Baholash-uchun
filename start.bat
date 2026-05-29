@echo off
chcp 65001 >nul
title DTP Ocenka

:: Electron borligini tekshirish
if not exist node_modules\electron\dist\electron.exe (
    echo Electron topilmadi, o'rnatilmoqda...
    npm install --ignore-scripts
    npm install electron@28.3.3
)

:: Ishga tushirish
npx electron .
