@echo off
echo ========================================================
echo   Starting Grid Master Solar Web Application...
echo ========================================================
echo.
echo Modern React/Vite web applications require a local server.
echo Opening http://localhost:3000 in your browser...
echo.

if exist dist (
  npx serve dist -p 3000
) else (
  npm run dev
)
pause
