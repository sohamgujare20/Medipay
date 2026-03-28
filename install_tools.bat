@echo off
echo ==================================================
echo Installing NodeJS and MongoDB using Winget
echo ==================================================
echo.

echo Installing Node.js LTS...
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent

echo Installing MongoDB Server...
winget install MongoDB.Server --accept-source-agreements --accept-package-agreements --silent

echo Installing MongoDB Compass...
winget install MongoDB.Compass.Full --accept-source-agreements --accept-package-agreements --silent

echo ==================================================
echo Installations Complete!
echo Press any key to exit...
pause >nul
