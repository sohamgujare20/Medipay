@echo off
echo Starting MediPay Database Backend...
start cmd /k "cd backend && node server.js"

echo Starting MediPay React Frontend...
start cmd /k "npm start"

echo Setup complete! Your browser should open shortly.
