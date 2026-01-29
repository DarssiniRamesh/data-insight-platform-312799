#!/bin/bash
cd /home/kavia/workspace/code-generation/data-insight-platform-312799/frontend_react
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

