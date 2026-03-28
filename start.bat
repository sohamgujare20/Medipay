@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo Starting MediPay Database Backend...
start cmd /k "cd backend && node server.js"

echo Starting MediPay React Frontend...
start cmd /k "cd frontend && npm start"

echo Setup complete! Your browser should open shortly.
